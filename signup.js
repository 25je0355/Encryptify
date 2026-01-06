const signupBtn = document.getElementById("signupBtn"); 
const verifyMfaBtn = document.getElementById("verifyMfaBtn"); 

signupBtn.addEventListener("click", async () => { 
  const email = document.getElementById("email").value; 
  const password = document.getElementById("password").value; 
  const confirmPassword = document.getElementById("confirmPassword").value; 

  if (!email || !password || !confirmPassword) { 
    alert("All fields required"); 
    return; 
  }

  if (password !== confirmPassword) { 
    alert("Passwords do not match"); 
    return; 
  }

  try {
    const res = await fetch("http://localhost:5000/auth/signup", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email, password }) 
    });

    const data = await res.json(); 

    if (!res.ok) { 
      alert(data.error || "Signup failed"); 
      return; 
    }

    
    document.getElementById("mfaSection").style.display = "block"; 
    document.getElementById("qrImage").src = data.qrCode; 

    
    localStorage.setItem("pendingMfaEmail", data.email); 

  } catch (err) {
    console.error(err); 
    alert("Server error"); 
  }
});

verifyMfaBtn.addEventListener("click", async () => { 
  const token = document.getElementById("mfaCode").value; 
  const email = localStorage.getItem("pendingMfaEmail"); 

  if (!token) { 
    alert("Enter MFA code"); 
    return; 
  }

  try {
    const res = await fetch("http://localhost:5000/auth/verify-mfa", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email, token }) 
    });

    const data = await res.json(); 

    if (!res.ok) { 
      alert(data.error || "MFA verification failed"); 
      return; 
    }

    
    document.getElementById("mfaSection").style.display = "none"; 
    document.getElementById("successMsg").style.display = "block"; 

    localStorage.removeItem("pendingMfaEmail"); 

  } catch (err) {
    console.error(err); 
    alert("Server error"); 
  }
});



