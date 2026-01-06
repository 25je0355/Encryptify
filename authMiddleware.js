const jwt = require("jsonwebtoken"); 

module.exports = (req, res, next) => { 

  const authHeader = req.headers.authorization; 

  console.log("AUTH HEADER:", authHeader); 

  if (!authHeader) {
    

    return res.status(401).json({ error: "No token provided" }); 
    
  }

  const token = authHeader.split(" ")[1]; 
  

  console.log("TOKEN:", token); 
  

  try {
    const decoded = jwt.verify(token, "SUPER_SECRET_KEY"); 
    

    console.log("DECODED:", decoded); 
    

    req.user = decoded; 
    

    next(); 
    
  } catch (err) {
    

    console.error("JWT ERROR:", err.message); 
    

    return res.status(401).json({ error: "Invalid token" }); 
    
  }
};


