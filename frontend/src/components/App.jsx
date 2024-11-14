import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Login from "../pages/Login";
import CreateAccount from "../pages/CreateAccount";
import AdminHome from "../pages/AdminHome";
import ProductList from "./ProductList";
import Header from "../pages/Homepage";

function App() {
    const { Data } = useAuth(); // Access auth state and user data

    return (
        <Routes>
            <Route path="/" element={<Header />} />
            <Route path="/login" element={<Login />} />
            <Route path="/create_account" element={<CreateAccount />} />
            <Route
                path="/form"
                element={Data?.isAdmin ? <AdminHome /> : <Login />}
            />
            <Route
                path="/list"
                element={
                    Data?.isUser ? <ProductList /> : <Navigate to={"/login"} />
                }
            />
        </Routes>
    );
}

export default App;
