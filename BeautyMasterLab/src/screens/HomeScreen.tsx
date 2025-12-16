import React from "react";
import "./HomeScreen.css";

export default function HomeScreen() {
  return (
    <div className="home-wrap">
      <h1 className="title">Beauty Master Lab</h1>

      <div className="menu-grid">
        <button className="menu-btn">Treatment Room</button>
        <button className="menu-btn">Avatar Customizing</button>
        <button className="menu-btn">Makeup Desk</button>
        <button className="menu-btn">Closet</button>
        <button className="menu-btn">Before / After Studio</button>
        <button className="menu-btn">Style Score</button>
        <button className="menu-btn">Missions</button>
        <button className="menu-btn">Profile</button>
        <button className="menu-btn">Shop</button>
      </div>
    </div>
  );
}
