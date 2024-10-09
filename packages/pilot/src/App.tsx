import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import logo from './logo.svg';
import './App.scss';
import { Products, Product, Customers, Customer, Layout, Home } from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="customers/">
            <Route index element={<Customers />} />
            <Route path=":id" element={<Customer />} />
          </Route>
          <Route path="products/">
            <Route index element={<Products />} />
            <Route path=":id" element={<Product />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
function App2() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
