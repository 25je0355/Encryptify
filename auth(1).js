const loginBtn = document.getElementById("loginBtn"); 
const verifyMfaBtn = document.getElementById("verifyMfaBtn"); 
const mfaSection = document.getElementById("mfaSection"); 

let pendingLogin = null; 


  //  LOGIN CLICK

loginBtn.addEventListener("click", async () => { 
  const email = document.getElementById("loginEmail").value; 
  const password = document.getElementById("loginPassword").value; 

  if (!email || !password) { 
    alert("Please enter email and password"); 
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/auth/login", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email, password }) 
    });

    const data = await res.json(); 

    
    if (res.status === 401 && data.mfaRequired) { 
      mfaSection.style.display = "block"; 
      pendingLogin = { email, password }; 
      alert("MFA required. Enter code."); 
      return;
    }

    if (!res.ok) { 
      alert(data.error || "Login failed"); 
      return;
    }

    
    localStorage.setItem("token", data.token); 
    window.location.href = "dashboard.html"; 

  } catch (err) {
    console.error(err); 
    alert("Server error"); 
  }
});


  //  VERIFY MFA

verifyMfaBtn.addEventListener("click", async () => { 
  const code = document.getElementById("mfaCode").value; 

  if (!code || !pendingLogin) { 
    alert("Missing MFA code"); 
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/auth/login", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({
        email: pendingLogin.email, 
        password: pendingLogin.password, 
        token: code 
      })
    });

    const data = await res.json(); 

    if (!res.ok) { 
      alert(data.error || "Invalid MFA code"); 
      return;
    }

    localStorage.setItem("token", data.token); 
    window.location.href = "dashboard.html"; 

  } catch (err) {
    console.error(err); 
    alert("Server error"); 
  }
});




