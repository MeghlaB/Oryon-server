
export const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;

    const user = await usersCollection.findOne({ email: email });

    if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden: Admin only" });
    }
    
    next();
};
