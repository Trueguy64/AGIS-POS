import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { GoldRateProvider } from "../contexts/GoldRateContext";
import ItemSelectionMenu from "../pages/ItemSelectionMenu";
import PaymentCalculation from "../pages/PaymentCalculation";
import EditorMenu from "../pages/editorMenu";
import SelectPaymentType from "../pages/SelectPaymentType";
import StoreProfile from "../pages/storeProfile";
import PaymentThankYou from "../pages/PaymentThankYou";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ReservePage from "../pages/ReservePage";
import ReservationsPage from "../pages/ReservationsPage";
import ProtectedRoute from "../components/Authentication/ProtectedRoute";

export default function AppRouter() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <GoldRateProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/reserve" element={<ReservePage />} />
                        <Route path="/reservations" element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} />

                        <Route path="/" element={<ProtectedRoute><ItemSelectionMenu /></ProtectedRoute>} />
                        <Route path="/payment" element={<ProtectedRoute><PaymentCalculation /></ProtectedRoute>} />
                        <Route path="/payment/types" element={<ProtectedRoute><SelectPaymentType /></ProtectedRoute>} />
                        <Route path="/payment/thankyou/:saleId" element={<ProtectedRoute><PaymentThankYou /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><StoreProfile /></ProtectedRoute>} />

                        <Route path="/editor" element={<ProtectedRoute role="Manager"><EditorMenu /></ProtectedRoute>} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </GoldRateProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
