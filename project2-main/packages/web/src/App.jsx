import { useState } from "react";
//dummy use only main.jsx
import SignInPage from "./components/SignInPage";
import NavBar from "./components/Navbar";
import CreateAccount from "./components/CreateAccount";
import { Outlet } from "react-router";
import Connect from "./components/Connect";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="home">
      <NavBar />
      <Outlet />
      <Connect />
      {/* <SignInPage /> */}
    </div>
  );
}

export default App;
