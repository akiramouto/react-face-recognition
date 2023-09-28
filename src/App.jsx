import NavigationComponent from "./components/NavigationComponent";
import { Outlet } from "react-router-dom";

function App() {
  return (
    <>
      <Outlet />
      <NavigationComponent />
    </>
  );
}

export default App;
