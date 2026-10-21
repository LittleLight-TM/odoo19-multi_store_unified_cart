import logging
import io
import base64
from odoo import models, fields, api, _

_logger = logging.getLogger(__name__)

try:
    import barcode
    from barcode.writer import ImageWriter
except ImportError:
    barcode = None

class PosSession(models.AbstractModel):
    _inherit = 'pos.session'

    @api.model
    def create_unified_cart(self, lines, barcode_code=None):
        try:
            if not lines:
                return {'status': 'error', 'message': _('السلة فارغة!')}

            # الباركود عبارة عن أرقام فقط (السنة + الشهر + اليوم + الساعة + الدقيقة + الثانية)
            if not barcode_code:
                barcode_code = fields.Datetime.now().strftime('%Y%m%d%H%M%S')

            cart = self.env['pos.unified.cart'].sudo().search([('barcode', '=', barcode_code)], limit=1)
            if not cart:
                cart = self.env['pos.unified.cart'].sudo().create({
                    'name': barcode_code,
                    'barcode': barcode_code,
                })

            for line in lines:
                product_id = line.get('product_id')
                qty = line.get('qty', 1)
                price_unit = line.get('price_unit', 0)

                existing_line = self.env['pos.unified.cart.line'].sudo().search([
                    ('cart_id', '=', cart.id),
                    ('product_id', '=', product_id)
                ], limit=1)

                if existing_line:
                    existing_line.sudo().write({
                        'quantity': existing_line.quantity + qty,
                        'price_unit': price_unit
                    })
                else:
                    self.env['pos.unified.cart.line'].sudo().create({
                        'cart_id': cart.id,
                        'product_id': product_id,
                        'quantity': qty,
                        'price_unit': price_unit,
                    })

            img_str = ""
            if barcode:
                try:
                    rv = io.BytesIO()
                    code128 = barcode.get('code128', barcode_code, writer=ImageWriter())
                    code128.write(rv)
                    img_str = base64.b64encode(rv.getvalue()).decode('utf-8')
                except Exception as e:
                    _logger.warning(f"Barcode image generation failed: {e}")

            return {
                'status': 'success',
                'barcode': barcode_code,
                'barcode_image': img_str,
                'message': _('تم حفظ وتحديث السلة الموحدة بنجاح.')
            }
        except Exception as e:
            _logger.error(f"Error in create_unified_cart: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    @api.model
    def add_or_fetch_cart(self, barcode_code):
        try:
            cart = self.env['pos.unified.cart'].sudo().search([('barcode', '=', barcode_code)], limit=1)
            if not cart or not cart.line_ids:
                return {
                    'status': 'error',
                    'message': _('لم يتم العثور على سلة بهذا الباركود، أو أن السلة فارغة.')
                }

            cart_lines = []
            for line in cart.line_ids:
                product = line.product_id.sudo()
                cart_lines.append({
                    'product_id': product.id,
                    'product_name': product.display_name,
                    'barcode': product.barcode,
                    'qty': line.quantity,
                    'price_unit': line.price_unit,
                })

            return {
                'status': 'success',
                'barcode': cart.barcode,
                'lines': cart_lines
            }
        except Exception as e:
            _logger.error(f"Error in add_or_fetch_cart: {str(e)}")
            return {'status': 'error', 'message': str(e)}