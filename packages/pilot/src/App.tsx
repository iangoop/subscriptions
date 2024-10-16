import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default App;
