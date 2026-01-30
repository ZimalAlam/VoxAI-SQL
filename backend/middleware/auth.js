const jwt = require('jsonwebtoken');

let isAuthorized = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).send({ error: "You are not authorized to access this route" });
    }

    try {
        const actualToken = token.split(' ')[1];
        const decoded = jwt.verify(actualToken, process.env.SECRET_KEY);
        req.user = decoded;

        if (req.user && req.user.id) {
            next();
        } else {
            return res.status(401).send({ message: "You are not authorized to access this route" });
        }
    } catch (error) {
        return res.status(401).send({ message: "Invalid token", error: error.toString() });
    }
};

module.exports = { isAuthorized };
