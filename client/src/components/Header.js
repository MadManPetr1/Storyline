import React from "react";
import "./Header.css";

export default function Header({ darkMode, toggleDarkMode }) {
  const logoSrc = darkMode
    ? "/assets/darkmode/Storyline_darkmode.svg"
    : "/assets/lightmode/Storyline_lightmode.svg";

  const toggleIconSrc = darkMode
    ? "/assets/darkmode/toLightmode.svg"
    : "/assets/lightmode/toDarkmode.svg";

  return (
    <header className="header">
      <img
        src={logoSrc}
        alt="Logo"
        className="logo"
      />
      <button className="theme-toggle-btn" onClick={toggleDarkMode}>
        <img
          src={toggleIconSrc}
          alt="Switch Theme"
          width={60}
          height={60}
        />
      </button>
    </header>
  );
}
