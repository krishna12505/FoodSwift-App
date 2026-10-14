function Header({ openLogin, openRegister}) {
    return (
        <header className="header">

            <div className="logo">

                <img
                    src="/foodswifticon.png"
                    alt="FoodSwift Logo"
                    className="logo-image"
                />

                <span className="brand-name">
                    FoodSwift
                </span>

            </div>

            <div className="header-button">

                <button
                    className="Signin-button"
                    onClick={openLogin}
                >
                    Sign In
                </button>

                <button 
                     className="signup-button"
                     onClick={openRegister}
                
                >
                    Sign Up
                </button>

            </div>

        </header>
    );
}

export default Header;
