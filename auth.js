const express = require("express"); 
const bcrypt = require("bcryptjs"); 
const jwt = require("jsonwebtoken"); 
const speakeasy = require("speakeasy"); 
const QRCode = require("qrcode"); 

const User = require("../models/User"); 

const router = express.Router(); 


  //  SIGNUP + QR GENERATION

router.post("/signup", async (req, res) => { 
  try {
    const { email, password } = req.body; 

    
    const existingUser = await User.findOne({ email }); 
    if (existingUser) { 
      return res.status(400).json({ error: "User already exists" }); 
    }

    
    const hashedPassword = await bcrypt.hash(password, 10); 

    
    const secret = speakeasy.generateSecret({ length: 20 }); 

    
    const user = await User.create({ 
      email, 
      password: hashedPassword, 
      mfaEnabled: false, 
      mfaSecret: secret.base32 
    });

    

    const otpauthUrl = speakeasy.otpauthURL({ 
      secret: secret.base32, 
      label: `Encryptify:${email}`, 
      issuer: "Encryptify", 
      encoding: "base32" 
    });

    const qrCode = await QRCode.toDataURL(otpauthUrl); 

    res.json({ 
      message: "Signup successful", 
      qrCode, 
      email 
    });

  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: "Signup failed" }); 
  }
});


  //  VERIFY MFA (ENABLE IT)

router.post("/verify-mfa", async (req, res) => { 
  try {
    const { email, token } = req.body; 

    const user = await User.findOne({ email }); 
    if (!user) { 
      return res.status(400).json({ error: "User not found" }); 
    }

    const verified = speakeasy.totp.verify({ 
      secret: user.mfaSecret, 
      encoding: "base32", 
      token, 
      window: 1 
    });

    if (!verified) { 
      return res.status(400).json({ error: "Invalid MFA code" }); 
    }

    user.mfaEnabled = true; 
    await user.save(); 

    res.json({ message: "MFA verified successfully" }); 

  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: "MFA verification failed" }); 
  }
});


  //  LOGIN (WITH MFA CHECK)

router.post("/login", async (req, res) => { 
  try {
    const { email, password, token: mfaToken } = req.body; 

    const user = await User.findOne({ email }); 
    if (!user) { 
      return res.status(400).json({ error: "Invalid credentials" }); 
    }

    const isMatch = await bcrypt.compare(password, user.password); 
    if (!isMatch) { 
      return res.status(400).json({ error: "Invalid credentials" }); 
    }

    

    if (!user.mfaEnabled) { 
      return res.status(403).json({
        error: "MFA not verified. Complete signup first."
      });
    }

    if (user.mfaEnabled) { 
      if (!mfaToken) { 
        return res.status(401).json({ mfaRequired: true }); 
      }

      const verified = speakeasy.totp.verify({ 
        secret: user.mfaSecret, 
        encoding: "base32", 
        token: mfaToken, 
        window: 1 
      });

      if (!verified) { 
        return res.status(400).json({ error: "Invalid MFA code" });
      }
    }

    // Issue JWT
    const jwtToken = jwt.sign( 
      { userId: user._id }, 
      "SUPER_SECRET_KEY", 
      { expiresIn: "1h" } 
    );

    res.json({ token: jwtToken }); 

  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: "Login failed" }); 
  }
});

module.exports = router; 














