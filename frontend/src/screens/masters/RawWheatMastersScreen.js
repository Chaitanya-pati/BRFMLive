import React from "react";
import TabbedMasterShell from "./TabbedMasterShell";
import SupplierMasterScreen from "../SupplierMasterScreen";
import MasterViewScreen from "../MasterViewScreen";

const fakeRoute = (params = {}) => ({ params });

export default function RawWheatMastersScreen({ navigation }) {
  const tabs = [
    {
      key: "suppliers",
      label: "Suppliers",
      render: (nav) => <SupplierMasterScreen navigation={nav} route={fakeRoute()} />,
    },
    {
      key: "magnets",
      label: "Magnets",
      render: (nav) => (
        <MasterViewScreen navigation={nav} route={fakeRoute({ initialTab: "magnets", lockTab: true })} />
      ),
    },
    {
      key: "machines",
      label: "Machines",
      render: (nav) => (
        <MasterViewScreen navigation={nav} route={fakeRoute({ initialTab: "machines", lockTab: true })} />
      ),
    },
    {
      key: "godown",
      label: "Godown Master",
      render: (nav) => (
        <MasterViewScreen navigation={nav} route={fakeRoute({ initialTab: "godown", lockTab: true })} />
      ),
    },
    {
      key: "bins",
      label: "Bins",
      render: (nav) => (
        <MasterViewScreen navigation={nav} route={fakeRoute({ initialTab: "bins", lockTab: true })} />
      ),
    },
  ];

  return <TabbedMasterShell navigation={navigation} title="Raw Wheat Masters" tabs={tabs} />;
}
