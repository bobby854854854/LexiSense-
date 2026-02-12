console.log(
  '%cLexiSense frontend is LIVE',
  'color:#4f46e5; font-size:20px; font-weight:bold'
)

document.body.innerHTML = `
  <div style="padding:40px; text-align:center; font-family:Arial; background:#f8fafc; min-height:100vh">
    <h1 style="font-size:60px; color:#4f46e5; margin:0">LexiSense</h1>
    <p style="font-size:24px; color:#16a34a; margin:20px 0">✅ Frontend is LIVE and connected</p>
    <p style="color:#64748b">Backend: https://lexisense-api.onrender.com</p>
    <button onclick="alert('It works! The full app will be here soon.')" 
            style="margin-top:30px; padding:15px 40px; font-size:18px; background:#4f46e5; color:white; border:none; border-radius:12px">
      Click me if you see this
    </button>
  </div>
`
