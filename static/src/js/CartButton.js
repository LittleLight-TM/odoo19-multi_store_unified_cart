/** @odoo-module **/

import { Component } from "@odoo/owl";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";

// -------------------------------------------------------------
// 1. زر جلب السلة الموحدة (Fetch Unified Cart)
// -------------------------------------------------------------
export class CartButton extends Component {
    static template = "multi_store_unified_cart.CartButton";
    static props = {
        onClick: { type: Function, optional: true },
    };

    setup() {
        this.pos = useService("pos");
        this.orm = useService("orm");
        this.notification = useService("notification");
    }

    async onClick() {
        if (!this.pos) return;

        const barcode = window.prompt(_t("امسح باركود السلة الموحدة بجهاز الباركود أو أدخله يدوياً:"));
        if (!barcode || !barcode.trim()) return;

        try {
            const cartData = await this.orm.call(
                "pos.session",
                "add_or_fetch_cart",
                [barcode.trim()]
            );

            if (cartData && cartData.status === "success" && cartData.lines && cartData.lines.length > 0) {
                let currentOrder = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;

                if (!currentOrder && typeof this.pos.add_new_order === "function") {
                    await this.pos.add_new_order();
                    currentOrder = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;
                }

                if (!currentOrder) {
                    this.notification.add(_t("تعذر تحديد الطلب الحالي في نقطة البيع."), { type: "danger" });
                    return;
                }

                // ربط رمز الباركود بالطلب الحالي لضمان التحديث على نفس السلة مستقبلاً
                currentOrder.cart_barcode = cartData.barcode;

                let addedCount = 0;
                let externalProductsCount = 0;

                for (const line of cartData.lines) {
                    let product = null;

                    if (this.pos.models && this.pos.models["product.product"]) {
                        product = this.pos.models["product.product"].get(line.product_id);
                    } else if (this.pos.db && typeof this.pos.db.get_product_by_id === "function") {
                        product = this.pos.db.get_product_by_id(line.product_id);
                    }

                    if (product) {
                        if (typeof currentOrder.add_product === "function") {
                            await currentOrder.add_product(product, {
                                quantity: parseFloat(line.qty),
                                price: parseFloat(line.price_unit),
                                merge: false
                            });
                        } else if (typeof this.pos.addLineToCurrentOrder === "function") {
                            await this.pos.addLineToCurrentOrder({
                                product_id: product,
                                qty: parseFloat(line.qty),
                                price_unit: parseFloat(line.price_unit)
                            });
                        }
                        addedCount++;
                    } else {
                        // المنتج ينتمي لقسم آخر وغير محمل في كاش هذا الـ POS
                        externalProductsCount++;
                        console.info(`المنتج [${line.product_name}] ينتمي لمتجر/قسم آخر ومحفوظ في السلة الموحدة.`);
                    }
                }

                if (addedCount > 0 || externalProductsCount > 0) {
                    if (typeof this.pos.selectOrder === "function") {
                        this.pos.selectOrder(currentOrder);
                    }

                    let message = `تم جلب السلة (${cartData.barcode}).`;
                    if (addedCount > 0) message += ` تم إضافة ${addedCount} منتج لهذا القسم.`;
                    if (externalProductsCount > 0) message += ` وهناك ${externalProductsCount} منتج من أقسام أخرى محفوطة في السلة.`;

                    this.notification.add(_t(message), { type: "success" });
                } else {
                    this.notification.add(
                        _t("لم يتم العثور على أسطر صالحة في السلة."),
                        { type: "warning" }
                    );
                }
            } else {
                this.notification.add(
                    _t(cartData?.message || "السلة فارغة أو غير موجودة."),
                    { type: "warning" }
                );
            }
        } catch (error) {
            console.error("Cart Fetch Error Details:", error);
            this.notification.add(
                _t("حدث خطأ أثناء جلب السلة. راجع Console لمزيد من التفاصيل."),
                { type: "danger" }
            );
        }
    }
}

// -------------------------------------------------------------
// 2. زر إنشاء/تحديث السلة الموحدة
// -------------------------------------------------------------
export class CreateCartButton extends Component {
    static template = "multi_store_unified_cart.CreateCartButton";
    static props = {
        onClick: { type: Function, optional: true },
    };

    setup() {
        this.pos = useService("pos");
        this.orm = useService("orm");
        this.notification = useService("notification");
    }

    async onClick() {
        if (!this.pos) return;

        const currentOrder = this.pos.get_order ? this.pos.get_order() : this.pos.selectedOrder;

        if (!currentOrder) {
            this.notification.add(_t("لا يوجد طلب نشط حالياً."), { type: "danger" });
            return;
        }

        let rawLines = [];
        if (typeof currentOrder.get_orderlines === "function") {
            rawLines = currentOrder.get_orderlines();
        } else if (typeof currentOrder.get_orderlines_list === "function") {
            rawLines = currentOrder.get_orderlines_list();
        } else if (currentOrder.orderlines) {
            rawLines = Array.isArray(currentOrder.orderlines) ? currentOrder.orderlines : Object.values(currentOrder.orderlines);
        } else if (currentOrder.lines) {
            rawLines = Array.isArray(currentOrder.lines) ? currentOrder.lines : Object.values(currentOrder.lines);
        }

        if (!rawLines || rawLines.length === 0) {
            this.notification.add(_t("السلة الحالية فارغة! أضف منتجات أولاً لإنشاء سلة موحدة."), { type: "warning" });
            return;
        }

        const cartItems = [];
        for (const line of rawLines) {
            let productId = null;
            let qty = 1;
            let price = 0;

            if (line.product_id) {
                productId = typeof line.product_id === "object" ? line.product_id.id : line.product_id;
            } else if (line.product) {
                productId = typeof line.product === "object" ? line.product.id : line.product;
            } else if (typeof line.get_product === "function") {
                const prod = line.get_product();
                if (prod) productId = prod.id;
            }

            qty = line.quantity ?? line.qty ?? (typeof line.get_quantity === "function" ? line.get_quantity() : 1);
            price = line.price ?? line.price_unit ?? (typeof line.get_unit_price === "function" ? line.get_unit_price() : 0);

            if (productId) {
                cartItems.push({
                    product_id: parseInt(productId),
                    qty: parseFloat(qty || 1),
                    price_unit: parseFloat(price || 0),
                });
            }
        }

        if (cartItems.length === 0) {
            this.notification.add(_t("لم يتم العثور على منتجات صالحة في السلة."), { type: "warning" });
            return;
        }

        try {
            // استخدام الباركود الموجود سابقاً إن وجد (لتحديث نفس السلة بدلاً من إنشائها من الجديد)
            const existingBarcode = currentOrder.cart_barcode || null;

            const res = await this.orm.call(
                "pos.session",
                "create_unified_cart",
                [cartItems, existingBarcode]
            );

            if (res && res.status === "success" && res.barcode) {
                if (res.barcode_image) {
                    const printWindow = window.open("", "_blank", "width=400,height=400");
                    printWindow.document.write(`
                        <html>
                            <head><title>باركود السلة الموحدة</title></head>
                            <body style="text-align:center; font-family:sans-serif; padding-top:20px;">
                                <h3>سلة موحدة - Unified Cart</h3>
                                <img src="data:image/png;base64,${res.barcode_image}" style="max-width:280px;" />
                                <h2>${res.barcode}</h2>
                                <script>
                                    window.onload = function() {
                                        window.print();
                                        setTimeout(function() { window.close(); }, 500);
                                    };
                                </script>
                            </body>
                        </html>
                    `);
                    printWindow.document.close();
                } else {
                    window.alert(_t(`تم حفظ السلة بنجاح!\nرمز الباركود: ${res.barcode}`));
                }

                // تفريغ الطلب الحالي بعد طباعة/حفظ السلة
                if (typeof currentOrder.destroy === "function") {
                    currentOrder.destroy();
                } else if (typeof this.pos.removeOrder === "function") {
                    this.pos.removeOrder(currentOrder);
                } else if (typeof currentOrder.empty === "function") {
                    currentOrder.empty();
                }

                this.notification.add(
                    _t(`تم حفظ السلة وتحديث الباركود: ${res.barcode}`),
                    { type: "success" }
                );
            } else {
                this.notification.add(_t(res?.message || "فشل إنشاء السلة الموحدة."), { type: "danger" });
            }
        } catch (error) {
            console.error("Create Cart Error Details:", error);
            this.notification.add(
                _t("حدث خطأ أثناء إنشاء السلة الموحدة."),
                { type: "danger" }
            );
        }
    }
}

// تسجيل المكونات في ProductScreen
patch(ProductScreen, {
    components: {
        ...ProductScreen.components,
        CartButton,
        CreateCartButton,
    },
});