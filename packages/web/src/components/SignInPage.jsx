// //duplicate > included logic in SignInApp.jsx

// import React, { useState } from "react";
// import "../styles/signinpage.min.css";
// import { Link } from "react-router";
// import { toast, ToastContainer } from "react-toastify";
// import { signInWithEmailAndPassword } from "firebase/auth";
// import { auth } from "./auth/firebase";

// export default function SignInPage() {
//   const [form, setForm] = useState({ email: "", password: "" });
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await signInWithEmailAndPassword(auth, form.email, form.password);
//       console.log("User Logged in succesfully!!");
//       window.location.href = "/connect";
//       toast.success("User Logged in Successfully!!", {
//         position: "top-center",
//       });
//     } catch (error) {
//       console.log("Error logging in:", error);
//       toast.error("Error logging in:", { position: "bottom-center" });
//     }
//   };

//   function onChange(e) {
//     const { name, value } = e.target;
//     setForm((f) => ({ ...f, [name]: value }));
//   }

//   async function onSubmit(e) {
//     e.preventDefault();
//     setLoading(true);
//     // TODO: plug into your API
//     await new Promise((r) => setTimeout(r, 600));
//     setLoading(false);
//     alert(`Signed in as ${form.email || "…"}`);
//   }

//   return (
//     <section id="signin" className="signin">
//       <h1>Sign in</h1>

//       <form className="card" onSubmit={handleSubmit}>
//         <label className="field">
//           <span className="field__label">Email</span>
//           <input
//             name="email"
//             value={form.email}
//             onChange={onChange}
//             placeholder="enter your email"
//             autoComplete="username"
//             required
//           />
//         </label>

//         <label className="field">
//           <span className="field__label">Password</span>
//           <input
//             type="password"
//             name="password"
//             value={form.password}
//             onChange={onChange}
//             placeholder="enter your password"
//             autoComplete="current-password"
//             required
//           />
//         </label>

//         <div className="actions">
//           <button className="btn btn--primary" type="submit" disabled={loading}>
//             {loading ? "Submitting…" : "Submit"}
//           </button>

//           <button className="btn btn--ghost" type="button">
//             <Link
//               to="/createAccount"
//               style={{ textDecoration: "none", color: "inherit" }}
//             >
//               Create account
//             </Link>
//           </button>
//           <ToastContainer />
//         </div>
//       </form>
//     </section>
//   );
// }
