import App from "./App";
import { Navigate } from "react-router-dom";

export const mainRoutes = {
  path: "/",
  element: <App />,
  errorElement: <p>Page Not Found</p>,
  children: [
    {
      index: true,
      element: <Navigate to="/home" replace={true} />,
    },
    {
      path: "/home",
      lazy: () => import("./pages/Home"),
    },
    {
      path: "/face-register",
      lazy: () => import("./pages/Register"),
    },
  ],
};
