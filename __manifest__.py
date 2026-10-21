{
    'name': 'Multi Store Unified Cart',
    'version': '19.0.1.0.0',
    'category': 'Point of Sale',
    'summary': 'Unified cart system across multiple stores in POS',
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'data/pos_unified_cart_data.xml',
        'views/pos_unified_cart_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'multi_store_unified_cart/static/src/js/CartButton.js',
            'multi_store_unified_cart/static/src/xml/CartButton.xml',
        ],
    },
    'license': 'LGPL-3',
    'installable': True,
    'auto_install': False,
}