import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';

const AuthContainer: React.FC = () => {
  const [isSignup, setIsSignup] = useState(false);

  return (
    <>
      {isSignup ? (
        <SignupScreen onSwitchToLogin={() => setIsSignup(false)} />
      ) : (
        <LoginScreen onSwitchToSignup={() => setIsSignup(true)} />
      )}
    </>
  );
};

export default AuthContainer;
