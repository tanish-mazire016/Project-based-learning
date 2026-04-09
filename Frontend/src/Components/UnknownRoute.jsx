import React from "react";
import { useNavigate } from "react-router-dom";


const UnknownRoute = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-sky-950 text-center px-4">
      <h1 className="text-7xl font-bold text-rose-500 animate-bounce mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-white mb-2">Oops! Page Not Found</h2>
      <p className="text-lg text-slate-300 mb-6">
        The page you're looking for doesn't exist
      </p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-500/40 
                   transition-all duration-200 font-medium"
      >
        Go Back Home
      </button>
      <p className="mt-8 text-sm text-slate-400 italic">
        Coming soon... stay tuned for updates!
      </p>
    </div>
  );
};

export default UnknownRoute;
