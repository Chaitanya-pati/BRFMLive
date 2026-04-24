import React from "react";
import TabbedMasterShell from "./TabbedMasterShell";
import CustomerMasterScreen from "../CustomerMasterScreen";
import DriverMasterScreen from "../DriverMasterScreen";
import TruckMasterScreen from "../TruckMasterScreen";

const fakeRoute = (params = {}) => ({ params });

export default function LogisticsMastersScreen({ navigation }) {
  const tabs = [
    {
      key: "customers",
      label: "Customers",
      render: (nav) => <CustomerMasterScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "drivers",
      label: "Drivers",
      render: (nav) => <DriverMasterScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "trucks",
      label: "Trucks",
      render: (nav) => <TruckMasterScreen navigation={nav} route={fakeRoute()} />,
    },
  ];

  return <TabbedMasterShell navigation={navigation} title="Logistics & Dispatch Masters" tabs={tabs} />;
}
