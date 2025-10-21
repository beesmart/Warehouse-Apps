// js/App.js
// Main Application Component

window.CartonApp = window.CartonApp || {};

window.CartonApp.MainApp = function() {
  console.log("✅ MainApp rendering");
  return React.createElement('div', null, 'Hello React!');
};