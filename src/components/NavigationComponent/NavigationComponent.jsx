import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";

const NavigationItem = (props) => {
  return (
    <Link
      to={props.to}
      className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group"
    >
      <FontAwesomeIcon icon={props.icon} />
      <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">
        {props.children}
      </span>
    </Link>
  );
};

const NavigationComponent = () => {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 dark:bg-gray-700 dark:border-gray-600">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        <NavigationItem to="/home" icon="fa-solid fa-house">
          Home
        </NavigationItem>
        <NavigationItem to="/face-register" icon="fa-solid fa-user-plus">
          Register
        </NavigationItem>
      </div>
    </div>
  );
};

export default NavigationComponent;
