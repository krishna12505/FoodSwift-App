import { useState } from "react";
import Header from "./components/header";
import LoginModel from "./pages/LoginModel";
import RegisterModel from "./pages/RegisterModel";

function App() {

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister,setShowRegister] = useState(false);

  return (
    <div>

      <Header
        openLogin={() => setShowLogin(true)}
        openRegister={() => setShowRegister(true)}
      />

      {showLogin && (
        <LoginModel
          closeLogin={() => setShowLogin(false)}
          openRegister={() => {setShowLogin(false);
                               setShowRegister(true);}}
        />
      )}

      {showRegister &&(
        <RegisterModel
        closeRegister={() => setShowRegister(false)}
        openLogin = {() => {setShowRegister(false);
                            setShowLogin(true);}}
        />
      )}

      <main className="home-content">

        <h1>FoodSwift</h1>

        <p>
          Your Food. Your Way. Your Swift.
        </p>

      </main>

    </div>
  );
}

export default App;