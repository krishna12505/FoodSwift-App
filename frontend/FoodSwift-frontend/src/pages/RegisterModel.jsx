import "./RegisterModel.css"
import { useState } from "react";

function RegisterModel({closeRegister,openLogin})
{
    const [showPassword,setShowPassword] = useState(false);
   return (
    <div className="model-overlay">
        <div className="register-model">
            <button className="close-button" onClick={closeRegister}>
                x
            </button>
            {/*Left section of page*/} 
            <div className="register-left">
                <div className="register-logo">
                    <img src="/foodswifticon.png" alt="foodswift"/>
                </div>
                
                <h2>Join FoodSwift</h2>
                <p>Create your account and enjoy delicious food delivery to your doorstep</p>
            </div>
            {/*  register right section*/}
            <div className="register-right">
                <h1>Create Account</h1>
                <p className="model-subtitle">Join FoodSwift today</p>
                <form>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input type="text" placeholder="Enter your Full Name" required/> 
                    </div>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input type="email" placeholder="Enter your Email" required/>
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <div className="password-box">
                            <input  type={"showPassword?text:password"} placeholder="Enter your Password" required/>
                            <button className="password-toggle" type="button" onClick={()=> setShowpassword(!showPassword)}>
                                {showPassword?"Hide":"Show"}
                            </button>
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Register As</label>
                        <select required>
                            <option value="">Select your role  </option>
                            <option value="customer">Customer</option>
                            <option value="restaurant">Restaurant Owner</option>
                            <option value="delivery">Delivery Partner</option>
                        </select>
                    </div>
                        {/* Submit button*/}
                        <button type="submit" className="login-submit">Create Account</button>
                </form>
                <p className="register-text">Already Have Account?<button type="button" onClick={openLogin}>Sign In</button></p>
            </div>
        </div>
    </div>

   );
}

export default RegisterModel;