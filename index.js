const express = require("express");
const app = express();
const SSLCommerzPayment = require("sslcommerz-lts");
const port = process.env.PORT || 5000;

const cors = require("cors");
require("dotenv").config();

// previous domain - https://gadgetzone-server.onrender.com/

app.use(
  cors({
    origin: ["http://localhost:5173", "https://oryon-gadgets.web.app", "https://oryon-gadgets.firebaseapp.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u2fu7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// .........Bikash-payment-gatway..........
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false; //true for live, false for sandbox

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("Ecommerce").collection("users");
    const productsCollection = client.db("Ecommerce").collection("products");
    const oderCollection = client.db("Ecommerce").collection("oders");
    const cartCollection = client.db("Ecommerce").collection("carts");
    const bannerImgCollection = client
      .db("Ecommerce")
      .collection("banner-images");

    // users post collection api //
    app.post("/users", async (req, res) => {
      const userData = req.body;

      const query = { email: userData.email };
      const exitingUser = await usersCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exits", instertedId: null });
      }
      const result = await usersCollection.insertOne(userData);

      res.send(result);
    });

    // user get collection api //
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();

      res.send(result);
    });

    // delete one user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      try {
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Failed to delete user:", error);
        res.status(500).send({ message: "Failed to delete user", error });
      }
    });

    // -------------admin panel related API----------------
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      res.send({ admin: user?.role === "admin" });
    });

    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);

      let seller = false;
      if (user) {
        seller = user.role === "seller";
      }

      res.send({ seller });
    });

    //----------Products Related API-------------
    // products post collection api
    app.post("/add-products", async (req, res) => {
      const productsData = req.body;
      const result = await productsCollection.insertOne(productsData);

      res.send(result);
    });

    // product get collection api
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();

      res.send(result);
    });

    // search api
    app.get("/products", async (req, res) => {
      const searchTerm = req.query.search || "";


      const products = await productsCollection.find({
        title: { $regex: searchTerm, $options: "i" },
      });

      res.json(products);
    });

    //   product get id api
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // delete one product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // update product
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedFields = req.body;

      if (!updatedFields || Object.keys(updatedFields).length === 0) {
        return res.status(400).send({ message: "No fields to update" });
      }

      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedFields };

      try {
        const result = await productsCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send({
          message: "Product updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update product", error });
      }
    });

    // product search api
    app.get("/search", async (req, res) => {
      const searchTerm = req.query.q;

      try {
        if (searchTerm == "") {
          const results = await productsCollection.find().toArray();
          res.send(results)
        }

        else {
          let query = {
            $or: [
              { title: { $regex: searchTerm, $options: "i" } },
              { category: { $regex: searchTerm, $options: "i" } },
              { brand: { $regex: searchTerm, $options: "i" } },
            ],
          };

          // If valid ObjectId, also include _id match
          if (isValidObjectId(searchTerm)) {
            query.$or.push({ _id: new ObjectId(searchTerm) });
          }

          const results = await productsCollection.find(query).toArray();

          res.send(results);
        }

      } catch (err) {
        console.error("Search error:", err);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //-------------Banner Related API----------------

    //Banner all data get api
    app.get("/bannerImgs", async (req, res) => {
      const result = await bannerImgCollection.find().toArray();
      res.send(result);
    });

    // Banner post api
    app.post("/bannerImg", async (req, res) => {
      const bannerImgLink = req.body;

      // Simple validation: check if there's a property like 'url' or any data
      if (!bannerImgLink || Object.keys(bannerImgLink).length === 0) {
        return res
          .status(400)
          .send({
            acknowledged: false,
            message: "Banner image data is required",
          });
      }

      try {
        const result = await bannerImgCollection.insertOne(bannerImgLink);

        res.send({ acknowledged: true, insertedId: result.insertedId });
      } catch (error) {
        // console.error("Error inserting banner image:", error);
        res.status(500).send({ acknowledged: false, message: "Server error" });
      }
    });

    // Banner delete Api
    app.delete("/bannerImg/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bannerImgCollection.deleteOne(query);
      res.send(result);
    });

    //..........orders api.................

    // Utility: check if valid ObjectId
    const isValidObjectId = (id) => {
      return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
    };

    // Search API
    // app.get("/search", async (req, res) => {
    //   const searchTerm = req.query.q;
    //   console.log('Third api: ', searchTerm)

    //   if (!searchTerm) {
    //     return res.status(400).send({ message: "Search term is required" });
    //   }

    //   try {
    //     let query = {
    //       $or: [
    //         { title: { $regex: searchTerm, $options: "i" } },
    //         { category: { $regex: searchTerm, $options: "i" } },
    //         { brand: { $regex: searchTerm, $options: "i" } },
    //       ],
    //     };

    //     // If valid ObjectId, also include _id match
    //     if (isValidObjectId(searchTerm)) {
    //       query.$or.push({ _id: new ObjectId(searchTerm) });
    //     }

    //     const results = await productsCollection.find(query).toArray();

    //     res.send(results);
    //   } catch (err) {
    //     console.error("Search error:", err);
    //     res.status(500).send({ message: "Internal Server Error" });
    //   }
    // });

    //..............PAYMENT GATEWAY INT............
    const tran_id = new ObjectId().toString();

    app.post('/order', async (req, res) => {
      const product = await productsCollection.findOne({ _id: new ObjectId(req.body.productId) })
      const order = req.body;
      // console.log(order);
      const data = {
        total_amount: product?.price,
        currency: order?.currency,
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `https://oryon-gadgets.firebaseapp.com/payment/success/${tran_id}`,
        fail_url: `https://oryon-gadgets.firebaseapp.com/payment/fail/${tran_id}`,
        cancel_url: "https://oryon-gadgets.firebaseapp.com/cancel",
        ipn_url: "https://oryon-gadgets.firebaseapp.com/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: order?.name,
        cus_email: "customer@example.com",
        cus_add1: order?.address,
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: order?.phone,
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        // console.log(GatewayPageURL)
        const finalOrder = {
          product,
          quantity: order?.quantity,
          totalPrice: product?.price * req.body.quantity,
          customerName: order?.customerName,
          customerEmail: order?.customerEmail,
          userEmail: order?.userEmail,
          shippingAddress: {
            street: order?.street,
            city: order?.city,
            postalCode: order?.postalCode || "",
            country: order?.country,
          },
          phone: req.body.phone,
          orderDate: new Date().toISOString(),
          paidStatus: false,
          tranjectionId: tran_id,
        };
        const result = oderCollection.insertOne(finalOrder);
        // console.log(result)

      });
    });

    app.post('/payment/success/:tranId', async (req, res) => {
      const result = await oderCollection.updateOne(
        { tranjectionId: req.params.tranId },
        {
          $set: {
            paidStatus: true,
          },
        }

      );
      console.log(result);
      if (result.modifiedCount > 0) {
        res.redirect(
          `https://oryon-gadgets.firebaseapp.com/payment/success/${req.params.tranId}`
        );

      }

    });


    app.post('/payment/fail/:tranId', async (req, res) => {
      const result = await oderCollection.deleteOne({ tranjectionId: req.params.tranId })
      // if(result.deletedCount){
      //   res.redirect(`https://oryontech.web.app/payment/fail/${req.params.tranId}`)
      // }
      if (result.deletedCount) {
        res.redirect(`https://oryon-gadgets.firebaseapp.com/payment/fail/${req.params.tranId}`)

      }
    })


    // app.get("/orders", async (req, res) => {
    //   const result = await oderCollection.find().toArray();
    //   console.log('First api working')
    //   res.send(result);
    // });


    //-----------Order Related API----------------

    // Get all orders with optional filtering and pagination
    app.get('/orders', async (req, res) => {
      try {
        const { page = 1, limit = 40, status, search } = req.query;
        const skip = (page - 1) * limit;

        // Build filter object
        let filter = {};

        // Status filter
        if (status && status !== 'all') {
          if (status === 'paid') {
            filter.paidStatus = true;
          } else if (status === 'unpaid') {
            filter.paidStatus = false;
          }
        }


        // Search filter
        if (search) {
          filter.$or = [
            { 'product.title': { $regex: search, $options: 'i' } },
            { _id: { $regex: search, $options: 'i' } },
            { transjectionId: { $regex: search, $options: 'i' } }
          ];
        }

        const result = await oderCollection
          .find(filter)
          .sort({ _id: -1 }) // Sort by most recent first
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        // Get total count for pagination
        const total = await oderCollection.countDocuments(filter);

        res.send({
          orders: result,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalOrders: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        });
      } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal server error');
      }

    });

    // 1 GET /orders?search=&status=&page=&limit=
    app.get("/orders", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 40;
        const status = req.query.status;
        const search = req.query.search || "";

        const filter = {};

        if (status === "paid") filter.paidStatus = true;
        else if (status === "unpaid") filter.paidStatus = false;

        if (search) {
          filter.$or = [
            { "product.title": { $regex: search, $options: "i" } },
            { _id: { $regex: search, $options: "i" } },
            { transjectionId: { $regex: search, $options: "i" } }
          ];
        }

        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);
        const orders = await Order.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);

        res.json({
          orders,
          pagination: { totalOrders, totalPages, currentPage: page }
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
      }

    });


    // ......ADD TO CART.....

    // Get single order by ID
    app.get('/orders/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send('Invalid order ID');
        }

        const order = await oderCollection.findOne({ _id: new ObjectId(id) });

        if (!order) {
          return res.status(404).send('Order not found');
        }

        res.send(order);
      } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Update order status (paid/unpaid)
    app.patch('/orders/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { paidStatus } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send('Invalid order ID');
        }

        if (typeof paidStatus !== 'boolean') {
          return res.status(400).send('paidStatus must be a boolean');
        }

        const result = await oderCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { paidStatus } },
          { returnDocument: 'after' }
        );

        if (!result.value) {
          return res.status(404).send('Order not found');
        }

        res.send(result.value);
      } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Delete an order
    app.delete('/orders/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send('Invalid order ID');
        }

        const result = await oderCollection.findOneAndDelete({ _id: new ObjectId(id) });

        if (!result.value) {
          return res.status(404).send('Order not found');
        }

        res.send({ message: 'Order deleted successfully', deletedOrder: result.value });
      } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Get orders statistics
    app.get('/orders-stats', async (req, res) => {
      try {
        const totalOrders = await oderCollection.countDocuments();
        const paidOrders = await oderCollection.countDocuments({ paidStatus: true });
        const unpaidOrders = await oderCollection.countDocuments({ paidStatus: false });

        // Get total revenue from paid orders
        const revenueResult = await oderCollection.aggregate([
          { $match: { paidStatus: true } },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: {
                  $multiply: [
                    { $toDouble: '$product.price' },
                    { $toInt: '$product.quantity' }
                  ]
                }
              }
            }
          }
        ]).toArray();

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        res.send({
          totalOrders,
          paidOrders,
          unpaidOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100 // Round to 2 decimal places
        });
      } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).send('Internal server error');
      }
    });


    //------------ CART Related API---------------

    app.post("/cart", async (req, res) => {
      const items = req.body;

      if (!items.userEmail || !items.productId) {
        return res
          .status(400)
          .send({
            acknowledged: false,
            message: "Missing userEmail or productId",
          });
      }

      try {
        const existing = await cartCollection.findOne({
          userEmail: items.userEmail,
          productId: items.productId,
        });

        if (existing) {
          return res.send({
            acknowledged: false,
            message: "Product already in cart",
          });
        }

        const result = await cartCollection.insertOne(items);
        return res.send({ acknowledged: true, insertedId: result.insertedId });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .send({ acknowledged: false, message: "Server error" });
      }
    });

    // delete cart product
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;

      if (!id) {
        return res
          .status(400)
          .send({ acknowledged: false, message: "Missing id" });
      }

      try {


        // Verify the ID format is valid
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ acknowledged: false, message: "Invalid ID format" });
        }

        const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });


        if (result.deletedCount === 1) {
          res.send({ acknowledged: true, message: "Deleted successfully" });
        } else {
          res
            .status(404)
            .send({ acknowledged: false, message: "Item not found" });
        }
      } catch (error) {
        console.error("Error deleting cart item:", error);
        res.status(500).send({ acknowledged: false, message: "Server error" });
      }
    });



    // Clear all cart products for a specific user
    app.delete("/carts/clear/:email", async (req, res) => {
      const email = req.params.email;

      if (!email) {
        return res.status(400).send({ acknowledged: false, message: "Missing email parameter" });
      }

      try {
        // Verify the email is valid
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).send({ acknowledged: false, message: "Invalid email format" });
        }

        const result = await cartCollection.deleteMany({ email: email });

        if (result.deletedCount > 0) {
          res.send({
            acknowledged: true,
            message: `Successfully cleared ${result.deletedCount} item${result.deletedCount !== 1 ? 's' : ''} from cart`
          });
        } else {
          res.status(404).send({ acknowledged: false, message: "No items found to clear" });
        }
      } catch (error) {
        console.error("Error clearing cart items:", error);
        res.status(500).send({ acknowledged: false, message: "Server error while clearing cart" });
      }
    });

    //get all cart products
    app.get("/all-carts", async (req, res) => {
      const allItems = req.body;
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res
          .status(400)
          .send({ message: "Email query parameter is required" });
      }

      try {
        const result = await cartCollection
          .find({ userEmail: email })
          .toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch cart items" });
      }
    });

    // ..............user,admin,seller profile api...............
    app.get("/users/profile/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { userEmail: email };
        const user = await usersCollection.findOne(query);
        if (user) {
          res.send(user);
        } else {
          res.status(404).send({ message: "user is not data found " });
        }
      } catch (error) {
        res.status(500).send({ message: "Error fetching user profile", error });
      }
    });

    // user update api.......................
    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const userData = req.body;

      if (!userData.name || !userData.email || !userData.photo) {
        return res.status(400).send({
          success: false,
          message: "Missing required fields: name, email, or photo",
        });
      }

      try {
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            name: userData.name,
            email: userData.email,
            photo: userData.photo,
          },
        };


        const result = await usersCollection.updateOne(query, updateDoc);
        const updatedUser = await usersCollection.findOne(query);

        if (result.modifiedCount > 0) {
          res.send({
            success: true,
            message: "Profile updated successfully!",
            user: updatedUser,
          });
        } else {
          res.send({
            success: false,
            message: "No changes were made.",
          });
        }
      } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({
          success: false,
          message: "Failed to update profile",
          error: error.message,
        });
      }
    });


    // .............Admin-Stats..............!

    app.get("/admin/stats", async (req, res) => {
      try {

        const totalOrders = await oderCollection.countDocuments();


        const totalRevenueAgg = await oderCollection.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" }
            }
          }
        ]).toArray();
        const totalRevenue = totalRevenueAgg[0]?.total || 0;


        const totalProducts = await productsCollection.countDocuments();


        const totalUsers = await usersCollection.countDocuments();

        // Pending Orders
        const pendingOrders = await oderCollection.countDocuments({ status: "pending" });

        // Completed Orders
        const completedOrders = await oderCollection.countDocuments({ status: "completed" });

        res.json({
          totalOrders,
          totalRevenue,
          totalProducts,
          totalUsers,
          pendingOrders,
          completedOrders
        });
      } catch (err) {
        console.error("Error fetching admin stats:", err);
        res.status(500).json({ error: "Server error" });
      }
    })





    // .............Admin-Stats..............!

    app.get("/admin/stats", async (req, res) => {
      try {

        const totalOrders = await oderCollection.countDocuments();


        const totalRevenueAgg = await oderCollection.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" }
            }
          }
        ]).toArray();
        const totalRevenue = totalRevenueAgg[0]?.total || 0;


        const totalProducts = await productsCollection.countDocuments();


        const totalUsers = await usersCollection.countDocuments();

        // Pending Orders
        const pendingOrders = await oderCollection.countDocuments({ status: "pending" });

        // Completed Orders
        const completedOrders = await oderCollection.countDocuments({ status: "completed" });

        res.json({
          totalOrders,
          totalRevenue,
          totalProducts,
          totalUsers,
          pendingOrders,
          completedOrders
        });
      } catch (err) {
        console.error("Error fetching admin stats:", err);
        res.status(500).json({ error: "Server error" });
      }
    })

    // Get admin dashboard statistics
    app.get('/admin-stats', async (req, res) => {
      try {
        // Get total orders
        const totalOrders = await oderCollection.countDocuments();

        // Get total revenue (sum of all order amounts)
        const revenueResult = await oderCollection.aggregate([
          { $match: { paidStatus: true } },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: {
                  $multiply: [
                    { $toDouble: '$product.price' },
                    { $toInt: '$product.quantity' }
                  ]
                }
              }
            }
          }
        ]).toArray();

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // Get total products
        const totalProducts = await productsCollection.countDocuments();

        // Get total users
        const totalUsers = await usersCollection.countDocuments();

        // Get pending orders
        const pendingOrders = await oderCollection.countDocuments({
          paidStatus: false
        });

        // Get completed orders
        const completedOrders = await oderCollection.countDocuments({
          paidStatus: true
        });

        res.send({
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProducts,
          totalUsers,
          pendingOrders,
          completedOrders
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Get recent orders
    app.get('/recent-orders', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 5;

        const orders = await oderCollection
          .find()
          .sort({ _id: -1 })
          .limit(limit)
          .toArray();

        // Format orders with customer information if available
        const formattedOrders = orders.map(order => ({
          _id: order._id,
          customerName: order.customer?.name || 'Guest Customer',
          customerEmail: order.customer?.email || 'No email',
          orderDate: order.orderDate || new Date(),
          totalAmount: order.product ?
            (parseFloat(order.product.price) * parseInt(order.product.quantity)) : 0,
          status: order.paidStatus ? 'completed' : 'processing'
        }));

        res.send(formattedOrders);
      } catch (error) {
        console.error('Error fetching recent orders:', error);
        res.status(500).send('Internal server error');
      }
    });

    // get orders for each user 
    app.get('/userOrder', async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }

      const orders = await oderCollection
        .find({ userEmail: email })
        .toArray(); // ✅ cursor → plain array

      res.status(200).json(orders); // ✅ JSON safe
    });


    // Revenue overview chart API (Last 30 days daily revenue)
    app.get('/revenue-overview', async (req, res) => {
      try {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const revenueData = await oderCollection.aggregate([
          {
            $match: {
              paidStatus: true,
              orderDate: { $gte: last30Days.toISOString() }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: { $toDate: "$orderDate" }
                }
              },
              totalRevenue: { $sum: "$totalPrice" },
              orderCount: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              date: "$_id",
              revenue: "$totalRevenue",
              orders: "$orderCount",
              _id: 0
            }
          }
        ]).toArray();

        // Fill in missing days with zero revenue
        const result = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toISOString().split('T')[0];

          const existingData = revenueData.find(item => item.date === dateString);

          result.push({
            date: dateString,
            revenue: existingData?.revenue || 0,
            orders: existingData?.orders || 0
          });
        }

        res.send(result);
      } catch (error) {
        console.error('Error fetching revenue overview:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Sales distribution by category API
    app.get('/sales-distribution', async (req, res) => {
      try {
        const distributionData = await oderCollection.aggregate([
          {
            $match: {
              paidStatus: true,
              "product.category": { $exists: true, $ne: null }
            }
          },
          {
            $group: {
              _id: "$product.category",
              totalSales: { $sum: 1 },
              totalRevenue: { $sum: "$totalPrice" },
              avgOrderValue: { $avg: "$totalPrice" }
            }
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
          {
            $project: {
              category: "$_id",
              sales: "$totalSales",
              revenue: "$totalRevenue",
              avgOrderValue: { $round: ["$avgOrderValue", 2] },
              _id: 0
            }
          }
        ]).toArray();

        res.send(distributionData);
      } catch (error) {
        console.error('Error fetching sales distribution:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Monthly revenue trend API
    app.get('/monthly-revenue', async (req, res) => {
      try {
        const currentYear = new Date().getFullYear();
        const monthlyData = await oderCollection.aggregate([
          {
            $match: {
              paidStatus: true,
              orderDate: {
                $gte: new Date(`${currentYear}-01-01`).toISOString()
              }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m",
                  date: { $toDate: "$orderDate" }
                }
              },
              revenue: { $sum: "$totalPrice" },
              orders: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              month: "$_id",
              revenue: "$revenue",
              orders: "$orders",
              _id: 0
            }
          }
        ]).toArray();

        // Fill in missing months
        const result = [];
        for (let month = 1; month <= 12; month++) {
          const monthStr = `${currentYear}-${month.toString().padStart(2, '0')}`;
          const existingData = monthlyData.find(item => item.month === monthStr);

          result.push({
            month: monthStr,
            revenue: existingData?.revenue || 0,
            orders: existingData?.orders || 0
          });
        }

        res.send(result);
      } catch (error) {
        console.error('Error fetching monthly revenue:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Top selling products API
    app.get('/top-products', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;

        const topProducts = await oderCollection.aggregate([
          {
            $match: {
              paidStatus: true,
              "product._id": { $exists: true }
            }
          },
          {
            $group: {
              _id: "$product._id",
              productName: { $first: "$product.title" },
              productImage: { $first: "$product.image" },
              category: { $first: "$product.category" },
              totalQuantity: { $sum: "$quantity" },
              totalRevenue: { $sum: "$totalPrice" }
            }
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: limit },
          {
            $project: {
              productId: "$_id",
              name: "$productName",
              image: "$productImage",
              category: "$category",
              quantitySold: "$totalQuantity",
              revenue: "$totalRevenue",
              _id: 0
            }
          }
        ]).toArray();

        res.send(topProducts);
      } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Real-time stats API (for dashboard cards)
    app.get('/dashboard-stats', async (req, res) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // Today's stats
        const todayOrders = await oderCollection.countDocuments({
          orderDate: { $gte: today.toISOString() },
          paidStatus: true
        });

        const todayRevenue = await oderCollection.aggregate([
          {
            $match: {
              orderDate: { $gte: today.toISOString() },
              paidStatus: true
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" }
            }
          }
        ]).toArray();

        // Yesterday's stats
        const yesterdayRevenue = await oderCollection.aggregate([
          {
            $match: {
              orderDate: {
                $gte: yesterday.toISOString(),
                $lt: today.toISOString()
              },
              paidStatus: true
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" }
            }
          }
        ]).toArray();

        // Last month's stats
        const lastMonthRevenue = await oderCollection.aggregate([
          {
            $match: {
              orderDate: { $gte: lastMonth.toISOString() },
              paidStatus: true
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" }
            }
          }
        ]).toArray();

        // Current month's stats
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthRevenue = await oderCollection.aggregate([
          {
            $match: {
              orderDate: { $gte: currentMonthStart.toISOString() },
              paidStatus: true
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" }
            }
          }
        ]).toArray();

        res.send({
          today: {
            orders: todayOrders,
            revenue: todayRevenue[0]?.total || 0
          },
          yesterday: {
            revenue: yesterdayRevenue[0]?.total || 0
          },
          currentMonth: {
            revenue: currentMonthRevenue[0]?.total || 0
          },
          lastMonth: {
            revenue: lastMonthRevenue[0]?.total || 0
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).send('Internal server error');
      }
    });

    // Customer acquisition metrics
    app.get('/customer-metrics', async (req, res) => {
      try {
        const metrics = await usersCollection.aggregate([
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m",
                  date: { $toDate: "$createdAt" }
                }
              },
              newUsers: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 6 },
          {
            $project: {
              month: "$_id",
              newUsers: 1,
              _id: 0
            }
          }
        ]).toArray();

        res.send(metrics);
      } catch (error) {
        console.error('Error fetching customer metrics:', error);
        res.status(500).send('Internal server error');
      }
    });


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.status(200).send({
    success: true,
    message: "ORYON Server is running...",
    path: req.path
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
