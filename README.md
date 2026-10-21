# Odoo 19 - Multi-Store Unified Cart (الموديل الموحد للسلة)

[![Odoo Version](https://img.shields.io/badge/Odoo-19.0-714B67.svg)](https://www.odoo.com)
[![License](https://img.shields.io/badge/License-LGPL--3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0.html)

A custom Odoo 19 module that provides a unified shopping cart system across multiple stores and Point of Sale (POS) terminals using unique barcodes.

تطبيق مخصص لإصدار أودو 19 يتيح ربط وجلب السلات الموحدة عبر نقاط البيع المجهزة في الفروع المختلفة باستخدام الباركود.

---

## 🛠 Features / المميزات

- **Unified Cart via Barcode:** Generate and fetch customer shopping cart lines from any POS terminal using a single barcode scan/input.
- **Multi-Store Support:** Seamless sync between multiple store branches and POS sessions.
- **Odoo 19 POS Compatibility:** Fully updated and patched to work with OWL Component & Reactive State Architecture in Odoo 19.

---

## 📋 Prerequisites / المتطلبات

- Odoo 19.0 (Community or Enterprise Edition)
- Point of Sale (`point_of_sale`) core module installed.

---

## 🚀 Installation / طريقة التثبيت

1. **Clone the repository** into your custom addons directory:
   ```bash
   cd /path/to/your/custom_addons
   git clone [https://github.com/LittleLight-TM/odoo19_multi_store_unified_cart.git](https://github.com/LittleLight-TM/odoo19_multi_store_unified_cart.git) multi_store_unified_cart