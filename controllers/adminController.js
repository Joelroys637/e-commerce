const { addProduct, getAllProducts, updateProduct, deleteProduct, getProductById } = require('../models/productModel');
const { getAllOrders } = require('../models/orderModel');

const getDashboard = async (req, res) => {
    const products = await getAllProducts();
    const orders = await getAllOrders();
    res.render('admin/dashboard', { productsCount: products.length, ordersCount: orders.length });
};

const getAddProduct = (req, res) => {
    res.render('admin/addProduct', { error: null });
};

const postAddProduct = async (req, res) => {
    const { name, price, offer, category, description } = req.body;

    try {
        if (!req.file) {
            throw new Error("Product Image is required.");
        }

        // Convert the image buffer directly to a base64 Data URL to save in Firestore
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const imageUrl = `data:${req.file.mimetype};base64,${b64}`;

        await addProduct({
            name,
            price: parseFloat(price),
            offer: parseFloat(offer),
            category,
            description,
            uploadimage: imageUrl
        });

        res.redirect('/admin/manage-products');
    } catch (error) {
        res.render('admin/addProduct', { error: error.message });
    }
};

const getManageProducts = async (req, res) => {
    const products = await getAllProducts();
    res.render('admin/manageProducts', { products });
};

const getUpdateProduct = async (req, res) => {
    const { id } = req.params;
    const product = await getProductById(id);
    res.render('admin/updateProduct', { product, error: null });
};

const postUpdateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, offer, category, description } = req.body;

    try {
        const updateData = { name, price: parseFloat(price), offer: parseFloat(offer), category, description };

        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            updateData.uploadimage = `data:${req.file.mimetype};base64,${b64}`;
        }

        await updateProduct(id, updateData);
        res.redirect('/admin/manage-products');
    } catch (error) {
        const product = await getProductById(id);
        res.render('admin/updateProduct', { product, error: error.message });
    }
};

const getDeleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await deleteProduct(id);
        res.redirect('/admin/manage-products');
    } catch (error) {
        res.redirect('/admin/manage-products');
    }
};

const getViewOrders = async (req, res) => {
    const orders = await getAllOrders();
    res.render('admin/viewOrders', { orders });
};

module.exports = {
    getDashboard,
    getAddProduct,
    postAddProduct,
    getManageProducts,
    getUpdateProduct,
    postUpdateProduct,
    getDeleteProduct,
    getViewOrders
};
