import React from "react";
import VendorForm from "../../src/components/VendorForm";

export default function VendorFormTestStory(args) {
  return <VendorForm {...args} />;
}

VendorFormTestStory.args = {
  open: true,
  onClose: () => {},
  onSubmit: () => {},
};
VendorFormTestStory.storyName = "Vendor Form Test Story";