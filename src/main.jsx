import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { Flowbite } from "flowbite-react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { mainRoutes } from "./routes";

library.add(fas, far, fab);

const router = createBrowserRouter([mainRoutes]);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Flowbite>
      <RouterProvider router={router} />
    </Flowbite>
  </React.StrictMode>
);
