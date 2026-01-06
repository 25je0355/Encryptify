document.addEventListener("DOMContentLoaded", () => { 

  
    //  AUTH CHECK
  
  const token = localStorage.getItem("token"); 
  if (!token) { 
    window.location.href = "auth.html"; 
    return; 
  }

  
    //  USER MENU
  
  const userBtn = document.getElementById("userBtn"); 
  const dropdown = document.getElementById("userDropdown");
  const logoutBtn = document.getElementById("logoutBtn"); 
  const userEmail = document.getElementById("userEmail"); 

  const email = localStorage.getItem("userEmail"); 
  if (email) userEmail.textContent = email; 

  userBtn.addEventListener("click", () => { 
    dropdown.classList.toggle("hidden"); 
  });

  logoutBtn.addEventListener("click", () => { 
    localStorage.clear(); 
    window.location.href = "auth.html"; 
  });

  
    //  PASSWORD CONFIRM
  
  let userPassword = null; 

  document.getElementById("confirmPasswordBtn").addEventListener("click", () => { 
    const pwd = document.getElementById("cryptoPassword").value; 
    if (!pwd) return alert("Password required"); 

    userPassword = pwd; 
    document.getElementById("passwordModal").style.display = "none"; 
    loadFiles(); 
  });

 
    //  FILE INPUT UI
  
  const fileInput = document.getElementById("fileInput"); 
  const placeholder = document.getElementById("filePlaceholder"); 

  fileInput.addEventListener("change", () => { 
    placeholder.textContent = fileInput.files.length 
      ? fileInput.files[0].name 
      : "Please upload your file here"; 
  });

  
    //  CRYPTO HELPERS
  
  async function deriveKey(password, salt) { 
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey( 
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey( 
      {
        name: "PBKDF2",
        salt, 
        iterations: 100000, 
        hash: "SHA-256" 
      },
      baseKey,
      { name: "AES-GCM", length: 256 }, 
      false,
      ["encrypt", "decrypt"] 
    );
  }

  async function decryptAndDownload(file) { 
    if (!userPassword) { 
      document.getElementById("passwordModal").style.display = "flex"; 
      return; 
    }

    try {
      const res = await fetch( 
        `http://localhost:5000/download/${file._id}`,
        { headers: { Authorization: "Bearer " + token } } 
      );

      if (!res.ok) throw new Error("Download failed"); 

      const buffer = await res.arrayBuffer(); 
      const data = new Uint8Array(buffer); 

      
      const salt = data.slice(0, 16); 
      const iv = data.slice(16, 28); 
      const encrypted = data.slice(28); 

      const key = await deriveKey(userPassword, salt); 

      const decrypted = await crypto.subtle.decrypt( 
        { name: "AES-GCM", iv },
        key,
        encrypted
      );

      
      const blob = new Blob([decrypted], { type: file.mimeType }); 
      const url = URL.createObjectURL(blob); 

      const a = document.createElement("a"); 
      a.href = url; 
      a.download = file.originalName.replace(/\.enc$/,""); 
      document.body.appendChild(a); 
      a.click(); 
      a.remove(); 

      URL.revokeObjectURL(url); 

    } catch (err) {
      console.error(err); 
      alert("Failed to decrypt file (wrong password or corrupted file)"); 
    }
  }

  
    //  UPLOAD
 
  document.getElementById("uploadBtn").addEventListener("click", async () => { 
    if (!userPassword) { 
      document.getElementById("passwordModal").style.display = "flex"; 
      return;
    }

    const file = fileInput.files[0]; 
    if (!file) return alert("Select a file first"); 

    try {
      const buffer = await file.arrayBuffer(); 
      const salt = crypto.getRandomValues(new Uint8Array(16)); 
      const iv = crypto.getRandomValues(new Uint8Array(12)); 
      const key = await deriveKey(userPassword, salt); 

      const encrypted = await crypto.subtle.encrypt( 
        { name: "AES-GCM", iv },
        key,
        buffer
      );

      const combined = new Uint8Array( 
        salt.length + iv.length + encrypted.byteLength
      );
      combined.set(salt, 0); 
      combined.set(iv, 16); 
      combined.set(new Uint8Array(encrypted), 28); 

      const blob = new Blob([combined], { type: "application/octet-stream" }); 
      const formData = new FormData(); 
      formData.append("file", blob, file.name + ".enc"); 

      const res = await fetch("http://localhost:5000/upload", { 
        method: "POST",
        headers: { Authorization: "Bearer " + token }, 
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed"); 

      fileInput.value = ""; 
      placeholder.textContent = "Please upload your file here"; 
      loadFiles(); 

    } catch (err) {
      console.error(err); 
      alert("Encryption or upload failed"); 
    }
  });

  
    //  LOAD FILE LIST
  
  async function loadFiles() { 
    const res = await fetch("http://localhost:5000/files", { 
      headers: { Authorization: "Bearer " + token } 
    });

    const files = await res.json(); 
    const list = document.getElementById("fileList"); 
    list.innerHTML = ""; 

    if (!files.length) { 
      list.innerHTML = "<p>No files uploaded yet</p>"; 
      return;
    }

    files.forEach(file => { 
      const row = document.createElement("div"); 
      row.className = "file-row"; 

      const left = document.createElement("div"); 
      left.className = "file-left";

      const icon = document.createElement("span"); 
      icon.className = "file-icon";
      icon.textContent = "📄"; 

      const name = document.createElement("span"); 
      name.className = "file-name";
      name.textContent = file.originalName; 

      
      name.addEventListener("click", () => decryptAndDownload(file)); 

      left.appendChild(icon); 
      left.appendChild(name); 
      row.appendChild(left); 

      list.appendChild(row); 
    });
  }

  function getFileIcon(filename) { 
    const ext = filename.split(".").pop().toLowerCase(); 
    if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "🖼️"; 
    if (["pdf"].includes(ext)) return "📄"; 
    if (["mp4", "mkv"].includes(ext)) return "🎬"; 
    if (["zip", "rar"].includes(ext)) return "🗜️"; 
    return "📁"; 
  } 

  
    //  INIT
  
  loadFiles(); 

});








