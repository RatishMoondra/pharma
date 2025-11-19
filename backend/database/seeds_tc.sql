INSERT INTO terms_conditions_master (term_text, category, priority, is_active, created_at, updated_at)
VALUES
-- GENERAL TERMS
('This Purchase Order must be acknowledged within 24 hours of receipt.', 'GENERAL', 1, TRUE, NOW(), NOW()),
('All supplies must strictly adhere to the specifications mentioned in the PO.', 'GENERAL', 2, TRUE, NOW(), NOW()),
('No deviation in material quality, specifications, or artwork is permitted without written approval.', 'GENERAL', 3, TRUE, NOW(), NOW()),
('Vendor must supply the material from approved manufacturing sites only.', 'GENERAL', 4, TRUE, NOW(), NOW()),
('Partial delivery must be communicated in advance for approval.', 'GENERAL', 5, TRUE, NOW(), NOW()),

-- QUALITY / GMP
('All materials must comply with applicable GMP and regulatory requirements.', 'QUALITY', 6, TRUE, NOW(), NOW()),
('Raw materials must be accompanied by a Certificate of Analysis (COA).', 'QUALITY', 7, TRUE, NOW(), NOW()),
('COA must match the batch supplied; retrospective COAs are not acceptable.', 'QUALITY', 8, TRUE, NOW(), NOW()),
('Packing materials must be as per approved artwork and die-line specifications.', 'QUALITY', 9, TRUE, NOW(), NOW()),
('Vendor must maintain proper traceability of raw material lots/batches used.', 'QUALITY', 10, TRUE, NOW(), NOW()),
('Vendor should notify any OOS or OOT before dispatch.', 'QUALITY', 11, TRUE, NOW(), NOW()),
('Any quality complaints must be addressed within 48 hours of intimation.', 'QUALITY', 12, TRUE, NOW(), NOW()),

-- RAW MATERIAL
('Raw materials must be packed in tamper-proof containers.', 'RAW_MATERIAL', 13, TRUE, NOW(), NOW()),
('Raw materials must be supplied with purity, assay, moisture content, and impurity profile.', 'RAW_MATERIAL', 14, TRUE, NOW(), NOW()),
('Material must have a minimum 80% shelf life remaining at the time of supply.', 'RAW_MATERIAL', 15, TRUE, NOW(), NOW()),
('Any deviation in pack size must be pre-approved.', 'RAW_MATERIAL', 16, TRUE, NOW(), NOW()),

-- PACKING MATERIAL / PRINTING MATERIAL
('Packing material must match the approved artwork version exactly.', 'PACKING_MATERIAL', 17, TRUE, NOW(), NOW()),
('Printing color, GSM, shade, and dimensions must meet approved standards.', 'PACKING_MATERIAL', 18, TRUE, NOW(), NOW()),
('No overprinting or part-printing is permitted without written approval.', 'PACKING_MATERIAL', 19, TRUE, NOW(), NOW()),
('Vendor must submit shade cards, proofs, or samples for approval when required.', 'PACKING_MATERIAL', 20, TRUE, NOW(), NOW()),
('Language-specific printing must strictly follow approved text.', 'PACKING_MATERIAL', 21, TRUE, NOW(), NOW()),
('Packing materials must be free from smudging, misalignment, or ink bleeding.', 'PACKING_MATERIAL', 22, TRUE, NOW(), NOW()),

-- FINISHED GOODS (FG MANUFACTURING)
('Manufacturing must use only approved raw and packing materials.', 'FINISHED_GOODS', 23, TRUE, NOW(), NOW()),
('Manufacturer must follow approved BMR/BPR for each batch.', 'FINISHED_GOODS', 24, TRUE, NOW(), NOW()),
('Stability data must be maintained for the manufactured batch.', 'FINISHED_GOODS', 25, TRUE, NOW(), NOW()),
('Batch production records must be shared within 2 working days of completion.', 'FINISHED_GOODS', 26, TRUE, NOW(), NOW()),
('Shelf life must comply with export market regulatory requirements.', 'FINISHED_GOODS', 27, TRUE, NOW(), NOW()),

-- DELIVERY & LOGISTICS
('Delivery must be made within the timeline committed in the PO.', 'DELIVERY', 28, TRUE, NOW(), NOW()),
('Advance dispatch intimation must be provided 48 hours prior.', 'DELIVERY', 29, TRUE, NOW(), NOW()),
('PO number, batch number, and item code must be mentioned on invoice & packing list.', 'DELIVERY', 30, TRUE, NOW(), NOW()),
('Damaged or short-supplied items will be rejected and replaced at no extra cost.', 'DELIVERY', 31, TRUE, NOW(), NOW()),
('Freight charges apply as per agreed Incoterms (FOB/CIF/Ex-Works).', 'DELIVERY', 32, TRUE, NOW(), NOW()),

-- PAYMENT
('Payment will be released only after verification of quality and quantity.', 'PAYMENT', 33, TRUE, NOW(), NOW()),
('Original invoice, COA, and delivery challan are mandatory for payment processing.', 'PAYMENT', 34, TRUE, NOW(), NOW()),
('Penalties may apply for delayed delivery beyond agreed timelines.', 'PAYMENT', 35, TRUE, NOW(), NOW()),
('TDS or statutory deductions may apply as per applicable laws.', 'PAYMENT', 36, TRUE, NOW(), NOW()),

-- LEGAL / COMPLIANCE
('Vendor must maintain confidentiality of product specifications and artwork.', 'LEGAL', 37, TRUE, NOW(), NOW()),
('Any breach of confidentiality may result in immediate contract termination.', 'LEGAL', 38, TRUE, NOW(), NOW()),
('All disputes are subject to the jurisdiction of the company’s registered location.', 'LEGAL', 39, TRUE, NOW(), NOW()),
('Company reserves the right to cancel the PO for justified reasons.', 'LEGAL', 40, TRUE, NOW(), NOW()),

-- EXPORT-SPECIFIC
('All documents must comply with export requirements of the destination country.', 'EXPORT', 41, TRUE, NOW(), NOW()),
('Wrong, incomplete, or missing documents may lead to rejection or penalties.', 'EXPORT', 42, TRUE, NOW(), NOW()),
('Vendor must provide MSDS for hazardous materials, if applicable.', 'EXPORT', 43, TRUE, NOW(), NOW()),
('Proper export packaging norms must be followed.', 'EXPORT', 44, TRUE, NOW(), NOW()),

-- COMPANY-SPECIFIC
('GST number must be mentioned on all invoices.', 'COMPANY', 45, TRUE, NOW(), NOW()),
('Price validity must be maintained for the agreed contract period.', 'COMPANY', 46, TRUE, NOW(), NOW()),
('Any statutory tax changes must be communicated immediately.', 'COMPANY', 47, TRUE, NOW(), NOW()),
('Vendor must inform about planned maintenance shutdowns in advance.', 'COMPANY', 48, TRUE, NOW(), NOW()),
('No price escalation will be accepted without written approval.', 'COMPANY', 49, TRUE, NOW(), NOW());
