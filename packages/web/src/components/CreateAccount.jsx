// //duplicate > included logic in SignInApp.jsx

// import React, { useState } from "react";
// import "../styles/createAccount.min.css";
// import { createUserWithEmailAndPassword } from "firebase/auth";
// import { auth, db } from "./auth/firebase";
// import { setDoc, doc } from "firebase/firestore";
// import { Link } from "react-router";
// import { toast, ToastContainer } from "react-toastify";

// export default function CreateAccount() {
//   const [form, setForm] = useState({
//     username: "",
//     email: "",
//     password: "",
//     confirmPassword: "",
//   });
//   const [loading, setLoading] = useState(false);

//   const handleRegister = async (e) => {
//     e.preventDefault();
//     try {
//       await createUserWithEmailAndPassword(auth, form.email, form.password);
//       const user = auth.currentUser;
//       console.log("User signed up:", user);
//       if (user) {
//         await setDoc(doc(db, "users", user.uid), {
//           username: form.username,
//           email: form.email,
//           password: form.password,
//         });
//       }
//       console.log("User Created Successfully!!");
//       toast.success("User Created Successfully!!", { position: "top-center" });
//     } catch (error) {
//       console.log("Error signing up:", error);
//       toast.error(error.message, { position: "bottom-center" });
//     }
//   };

//   function handleChange(e) {
//     const { name, value } = e.target;
//     setForm((prev) => ({ ...prev, [name]: value }));
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     if (form.password !== form.confirmPassword) {
//       alert("Passwords do not match!");
//       return;
//     }
//     setLoading(true);

//     // Simulate API call
//     await new Promise((resolve) => setTimeout(resolve, 800));
//     setLoading(false);
//     alert(`Account created for ${form.username}!`);
//   }

//   return (
//     <section className="create-account">
//       <h1>Create account</h1>

//       <form className="card" onSubmit={handleRegister}>
//         <label className="field">
//           <span className="field__label">Username</span>
//           <input
//             type="text"
//             name="username"
//             value={form.username}
//             onChange={handleChange}
//             required
//           />
//         </label>

//         <label className="field">
//           <span className="field__label">Email</span>
//           <input
//             type="email"
//             name="email"
//             value={form.email}
//             onChange={handleChange}
//             required
//           />
//         </label>

//         <label className="field">
//           <span className="field__label">Password</span>
//           <input
//             type="password"
//             name="password"
//             value={form.password}
//             onChange={handleChange}
//             required
//           />
//         </label>

//         <label className="field">
//           <span className="field__label">Confirm password</span>
//           <input
//             type="password"
//             name="confirmPassword"
//             value={form.confirmPassword}
//             onChange={handleChange}
//             required
//           />
//         </label>

//         <div className="actions">
//           <button className="btn btn--primary" type="submit" disabled={loading}>
//             {loading ? "Creating..." : "Create account"}
//           </button>

//           <button
//             className="btn btn--ghost"
//             type="button"
//             onClick={() => alert("Redirect to Sign In")}
//           >
//             <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
//               {" "}
//               Back to Sign in
//             </Link>
//           </button>
//           <ToastContainer />
//         </div>
//       </form>
//     </section>
//   );
// }
