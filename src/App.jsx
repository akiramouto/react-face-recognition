import NavigationComponent from "./components/NavigationComponent";
import { Outlet } from "react-router-dom";

function App() {
  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="flex flex-col justify-center align-center  h-[100vh] ">
        <Outlet />
      </div>
      <NavigationComponent />
    </section>
  );
}

export default App;
