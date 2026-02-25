import React from "react";
import { FiMenu } from "react-icons/fi";

const MobileHeader = ({ toggleSidebar }) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-300 flex items-center justify-between px-4 z-50 md:hidden shadow-sm">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg text-gray-700 hover:text-black hover:bg-gray-100 transition-all duration-200 border border-gray-300"
      >
        <FiMenu className="w-6 h-6" />
      </button>
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-bold text-black">Dashboard</h1>
      </div>
      <div className="w-10"></div>
    </div>
  );
};

export default MobileHeader;
