from odoo import models, fields


class PosUnifiedCart(models.Model):
    _name = 'pos.unified.cart'
    _description = 'Unified Cart for Multiple Stores'

    name = fields.Char(string='اسم السلة أو العميل', required=True)
    barcode = fields.Char(string='باركود السلة', required=True, index=True)
    state = fields.Selection([
        ('draft', 'مسودة'),
        ('active', 'نشطة'),
        ('done', 'تمت الاستفادة منها'),
        ('cancelled', 'ملغاة')
    ], string='الحالة', default='active')

    line_ids = fields.One2many('pos.unified.cart.line', 'cart_id', string='مكونات السلة')
    store_id = fields.Many2one('pos.config', string='نقطة البيع المصدر')


class PosUnifiedCartLine(models.Model):
    _name = 'pos.unified.cart.line'
    _description = 'Unified Cart Line'

    cart_id = fields.Many2one('pos.unified.cart', string='السلة', ondelete='cascade')
    product_id = fields.Many2one('product.product', string='المنتج', required=True)
    quantity = fields.Float(string='الكمية', default=1.0)
    price_unit = fields.Float(string='سعر الوحدة')