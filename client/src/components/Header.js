// components/Header.js
import React from "react";
import "./Header.css";

import LogoLight from "../assets/lightmode/Storyline_lightmode.svg";
import LogoDark from "../assets/darkmode/Storyline_darkmode.svg";
import ToggleToDark from "../assets/lightmode/todarkmode.svg";
import ToggleToLight from "../assets/darkmode/tolightmode.svg";

export default function Header({ darkMode, toggleDarkMode }) {
  return (
    <header className="header">
      <img
        src={darkMode ? LogoDark : LogoLight}
        alt="Storyline"
        className="logo"
      />
      <button className="theme-toggle-btn" onClick={toggleDarkMode}>
        <img
          src={darkMode ? ToggleToLight : ToggleToDark}
          alt="Switch Theme"
          width={60}
          height={60}
        />
      </button>
    </header>
  );
}