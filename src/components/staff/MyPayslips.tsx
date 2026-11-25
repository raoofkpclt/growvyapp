import { auth } from "../../config/firebase/firebase";
import PayslipsPanel from "./PayslipsPanel";

/** Add this as a "Payslips" page for every staff role. */
const MyPayslips = () => {
  const me = auth.currentUser;
  const viewer = { uid: me?.uid ?? "", name: me?.displayName ?? me?.email ?? "" };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      {/* <div>
        <h2 className="text-lg font-semibold text-white sm:text-xl">My payslips</h2>
        <p className="text-sm text-zinc-500">
          Your payslip is sent here when HR marks your salary as paid. View it or download it
          anytime.
        </p>
      </div> */}

      <PayslipsPanel scope="own" viewer={viewer} />
    </div>
  );
};

export default MyPayslips;