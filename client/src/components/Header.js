// src/components/Header.js
import React from "react";
import "./Header.css";

export default function Header({ darkMode, toggleDarkMode }) {
  return (
    <header className="header">
      <div className="header-inner">
        <img
          src={darkMode
            ? "/assets/darkmode/Storyline_darkmode_1000x500.png"
            : "/assets/lightmode/Storyline_lightmode_1000x500.png"}
          alt="Storyline Logo"
          className="logo"
        />
        <button className="theme-toggle-btn" onClick={toggleDarkMode}>
          <img
            src={darkMode
              ? "/assets/darkmode/toDarkmode.svg"
              : "/assets/lightmode/toLightmode.svg"}
            alt="Toggle Theme"
            className="toggle-icon"
          />
        </button>
      </div>
    </header>
  );
}