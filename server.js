const express = require("express"); 
const multer = require("multer"); 
const cors = require("cors"); 
const path = require("path"); 
const fs = require("fs"); 
const mongoose = require("mongoose"); 

const authMiddleware = require("./middleware/authMiddleware"); 
const File = require("./models/file"); 

const app = express(); 
app.use(cors()); 
app.use(express.json()); 


  //  MongoDB

mongoose
  .connect("mongodb://127.0.0.1:27017/encryptify") 
  .then(() => console.log("MongoDB connected")) 
  .catch(err => console.error(err)); 


  //  Upload directory

const UPLOAD_DIR = path.join(__dirname, "uploads"); 

if (!fs.existsSync(UPLOAD_DIR)) { 
  fs.mkdirSync(UPLOAD_DIR); 
}


  //  Multer config

const storage = multer.diskStorage({ 
  destination: (req, file, cb) => { 
    cb(null, UPLOAD_DIR); 
  },
  filename: (req, file, cb) => { 
    const uniqueName = Date.now() + "-" + file.originalname; 
    cb(null, uniqueName);
  }
});

const upload = multer({ storage }); 


  //  ROUTES



app.post(
  "/upload", 
  authMiddleware, 
  upload.single("file"), 
  async (req, res) => { 
    console.log("USER:", req.user); 
    console.log("File:", req.file); 

    try {
      if (!req.file) { 
        return res.status(400).json({ error: "No file uploaded" }); 
      }

      await File.create({ 
        userId: req.user.userId, 
        originalName: req.file.originalname, 
        storedName: req.file.filename, 
        size: req.file.size 
      });

      res.json({ message: "Encrypted file stored" }); 
    } catch (err) {
      console.error(err); 
      res.status(500).json({ error: "Upload failed" }); 
    }
  }
);


app.get("/files", authMiddleware, async (req, res) => { 
  try {
    const userId = req.user.userId; 

    const files = await File.find({ userId }).sort({ createdAt: -1 }); 

    const existingFiles = files.filter(file => { 
      const filePath = path.join(UPLOAD_DIR, file.storedName); 
      return fs.existsSync(filePath); 
    });

    res.json(existingFiles); 

  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: "Failed to fetch files" }); 
  }
});

app.get("/download/:fileId", authMiddleware, async (req, res) => { 
  try {
    const { fileId } = req.params; 
    const userId = req.user.userId; 

   
    const file = await File.findById(fileId); 

    if (!file) { 
      return res.status(404).json({ error: "File not found" }); 
    }

    
    if (file.userId.toString() !== userId) { 
      return res.status(403).json({ error: "Access denied" }); 
    }

  
    const filePath = path.join(__dirname, "uploads", file.storedName); 

    if (!fs.existsSync(filePath)) { 
      return res.status(404).json({ error: "File missing on server" }); 
    }

   
    res.set({ 
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", 
      "Pragma": "no-cache", 
      "Expires": "0", 
      "Surrogate-Control": "no-store", 
      "Content-Type": "application/octet-stream" 
    });

    const fileBuffer = fs.readFileSync(filePath); 
    res.status(200).send(fileBuffer); 

  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: "Download failed"}); 
  }
});


app.get("/download/:filename", authMiddleware, (req, res) => { 
  const filePath = path.join(UPLOAD_DIR, req.params.filename); 

  if (!fs.existsSync(filePath)) { 
    return res.status(404).json({ error: "File not found" }); 
  }

  res.sendFile(filePath); 
});


  //  Auth routes

const authRoutes = require("./routes/auth"); 
app.use("/auth", authRoutes); 


  //  Health check

app.get("/health", (req, res) => { 
  res.send("OK"); 
});


  //  Start server

app.listen(5000, () => { 
  console.log("Backend running on http://localhost:5000"); 
});






