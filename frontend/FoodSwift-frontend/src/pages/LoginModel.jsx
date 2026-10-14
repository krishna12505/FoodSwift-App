import "./LoginModel.css";
import { useState } from "react";

function LoginModel({ closeLogin, openRegister }) {

    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="modal-overlay">

            <div className="login-modal">

                {" "}
                <button className="close-button" onClick={closeLogin}>
                    ×
                </button>

                {" "}
                <div className="login-left">

                    <div className="login-logo">
                        <img
                            src="/foodswifticon.png"
                            alt="FoodSwift"
                        />
                    </div>

                    <h2>FoodSwift</h2>

                    <p>
                        Delicious food is just a few clicks away.
                    </p>


                </div>

               
                <div className="login-right">

                    <h1>Welcome Back!</h1>

                    <p className="modal-subtitle">
                        Sign in to continue to FoodSwift
                    </p>

                    <form>

                       
                        <div className="input-group">

                            <label>Email Address</label>

                            <input
                                type="email"
                                placeholder="Enter your email"
                                required
                            />

                        </div>

                       
                        <div className="input-group">

                            <label>Password</label>

                            <div className="password-box">

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Enter your password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>

                            </div>

                        </div>

                        {/* Forgot Password */}
                        <div className="forgot-password">
                            <button type="button">
                                Forgot Password?
                            </button>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            className="login-submit"
                        >
                            Sign In
                        </button>

                    </form>

                    {/* Register */}
                    <p className="register-text">

                        Don't have an account?

                        <button
                            type="button"
                            onClick={openRegister}
                        >
                            Sign Up
                        </button>

                    </p>

                </div>

            </div>

        </div>
    );
}

export default LoginModel;

