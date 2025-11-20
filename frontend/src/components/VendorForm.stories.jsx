import React from "react";
import VendorForm from "../../src/components/VendorForm";

export default function Default(args) {
  return <VendorForm {...args} />;
}

Default.args = {
  open: true,
  onClose: () => {},
  onSubmit: () => {},
};
Default.storyName = "Default Vendor Form";