
import { Toaster } from "react-hot-toast";
import Board from "./components/board/Board";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Board />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "10px",
            fontSize: "13px",
          },
        }}
      />
    </div>
  );
}

export default App;
