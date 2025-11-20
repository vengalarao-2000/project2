//Moved export functionality to Processed Section in Dashboard

// import { exportProcessedCSV } from "../../utils/exportCSV";

// export default function HeaderBar() {
//     return (
//         <header className="bg-white shadow-sm sticky-top">
//             <div className="container d-flex justify-content-between align-items-center py-3">
//                 {/* Left: Logo + Text */}
//                 <div className="d-flex align-items-center gap-2">
//                     <img
//                         src="/images/paw_logo.png"
//                         alt="Paws & Pixels Logo"
//                         className="object-fit-contain"
//                         style={{ width: 44, height: 44 }}
//                     />
//                     <h1 className="h5 mb-0 fw-bold text-dark">
//                         Paws <span className="text-black">&amp;</span> Pixels
//                     </h1>
//                 </div>

//                 {/* Right: Export + Profile */}
//                 <div className="d-flex align-items-center gap-3">
//                     <button
//                         onClick={() => exportProcessedCSV(window.latestProcessed || [])}
//                         className="btn btn-primary"
//                     >
//                         Export CSV
//                     </button>

//                     {/* Simple profile circle icon */}
//                     <div className="rounded-circle bg-light d-flex align-items-center justify-content-center shadow-sm"
//                         style={{ width: 36, height: 36 }}>
//                         <svg xmlns="http://www.w3.org/2000/svg" fill="#5f6368" viewBox="0 0 24 24" width="18" height="18">
//                             <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
//                         </svg>
//                     </div>
//                 </div>
//             </div>
//         </header>
//     );
// }
