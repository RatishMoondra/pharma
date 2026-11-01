# Live PostgreSQL schema: `pharma_db`

This reference was extracted directly from the running PostgreSQL server on **2026-11-01** using PostgreSQL 18.6 `pg_dump --schema-only`. It describes the database observed by that connection, not the SQLAlchemy models or a proposed Medusa schema.

## Instance that was inspected

| Property | Observed value |
|---|---|
| Host used for extraction | `localhost` (server reported `::1`) |
| Port | `5432` |
| Database | `pharma_db` |
| Database user | `postgres` |
| Server version | PostgreSQL 18.6, x86_64-windows, 64-bit |
| Alembic revision | `5374a7ebec48` |
| Schema inspected | `public` |

This is the local Windows PostgreSQL instance. The project Compose configuration uses host name `db` for the backend container, so this extraction confirms that the local server accepts the project credentials and has the same database name; it does not prove that a Docker Compose database is running or that the running application process is currently connected to this local service.

The complete schema-only DDL snapshot (no row data, ownership, or grants) is in [`pharma_db_live_schema.sql`](pharma_db_live_schema.sql). It is suitable for review and diffing; review carefully before using it to recreate or alter any database.

## Contents

The `public` schema has **29 tables** and **8 PostgreSQL enum types**. A database's `alembic_version` table is included in the count.

### Tables

| Table | Database-level purpose / notes |
|---|---|
| `alembic_version` | Alembic migration marker; observed revision `5374a7ebec48`. |
| `countries` | Country, language and currency reference. |
| `dispatch_advice` | Finished-goods dispatch records. |
| `eopa` | Estimated-order approval headers. |
| `eopa_backup` | Backup/archive-shaped table; columns are nullable and there is no PK or FK constraint in the live DDL. |
| `eopa_items` | Estimated-order approval lines. |
| `material_balance` | Raw/packing material balance records tied to vendor, PO, and invoice. Exists in this database even though a migration file proposes dropping it. |
| `material_receipts` | PO material receipt records. |
| `medicine_master` | Medicine catalog and supplier links. |
| `medicine_packing_materials` | Medicine-to-packing-material BOM. |
| `medicine_raw_materials` | Medicine-to-raw-material BOM. |
| `packing_material_master` | Packing-material catalog. |
| `partner_vendor_medicines` | Partner-to-medicine availability mapping. |
| `pi` | Proforma invoice/request headers. |
| `pi_items` | Proforma invoice/request lines. |
| `po_items` | Purchase-order lines; product references can point to medicine, raw material, or packing material. |
| `po_terms_conditions` | Terms copied onto purchase orders. |
| `product_master` | General product classification. |
| `purchase_orders` | Purchase-order headers. |
| `raw_material_master` | Raw-material catalog. |
| `system_configuration` | Application key/value configuration. |
| `terms_conditions_master` | Reusable terms library. |
| `users` | Internal application users. |
| `vendor_invoice_items` | Supplier invoice lines, including optional batch and expiry data. |
| `vendor_invoices` | Supplier invoice headers; live DDL also has nullable batch/manufacture/expiry columns on this header. |
| `vendor_terms_conditions` | Terms assigned to vendors. |
| `vendors` | Partner, raw-material supplier, packing supplier, and manufacturer master. |
| `warehouse_grn` | Warehouse goods receipt notes. |

### Enum types and values

| Type | Values in live PostgreSQL |
|---|---|
| `eopastatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `invoicestatus` | `PENDING`, `PROCESSED`, `CANCELLED` |
| `invoicetype` | `RM`, `PM`, `FG` |
| `pistatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `postatus` | `OPEN`, `CLOSED`, `CANCELLED`, `PARTIAL`, `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `READY`, `SENT`, `ACKNOWLEDGED` |
| `potype` | `RM`, `PM`, `FG` |
| `userrole` | `ADMIN`, `PROCUREMENT_OFFICER`, `WAREHOUSE_MANAGER`, `ACCOUNTANT` |
| `vendortype` | `PARTNER`, `RM`, `PM`, `MANUFACTURER` |

## Exact columns, primary keys, and nullability

Notation: `!` = `NOT NULL`; `PK` = primary key; `UQ` = unique constraint/index. Types and nullability below come from PostgreSQL DDL, not from model annotations.

| Table | Columns (`name type [flags]`) |
|---|---|
| `alembic_version` | `version_num varchar(32) !` (no declared PK) |
| `countries` | `id integer ! PK`; `country_code varchar(3) ! UQ`; `country_name varchar(100) ! UQ`; `language varchar(50) !`; `currency varchar(3)`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `dispatch_advice` | `id integer ! PK`; `dispatch_number varchar(50) ! UQ`; `dispatch_date date !`; `medicine_id integer ! FK`; `quantity_dispatched numeric(15,3) !`; `destination varchar(200) !`; `remarks text`; `dispatched_by integer ! FK`; `created_at timestamp without time zone !` |
| `eopa` | `id integer ! PK`; `eopa_number varchar(50) ! UQ`; `eopa_date date !`; `pi_id integer ! FK`; `status eopastatus !`; `remarks text`; `approved_by integer FK`; `approved_at timestamp without time zone`; `created_by integer ! FK`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `eopa_backup` | `id integer`; `eopa_number varchar(50)`; `eopa_date date`; `pi_item_id integer`; `medicine_id integer`; `quantity numeric(15,3)`; `estimated_unit_price numeric(15,2)`; `estimated_total numeric(15,2)`; `status varchar(20)`; `remarks text`; `approved_by integer`; `approved_at timestamp without time zone`; `created_by integer`; `created_at timestamp without time zone`; `updated_at timestamp without time zone` (no PK/FKs/NOT NULL constraints) |
| `eopa_items` | `id integer ! PK`; `eopa_id integer ! FK`; `pi_item_id integer ! FK`; `quantity numeric(15,3) !`; `estimated_unit_price numeric(15,2) !`; `estimated_total numeric(15,2) !`; `created_by integer ! FK`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `material_balance` | `id integer ! PK`; `raw_material_id integer FK`; `vendor_id integer ! FK`; `po_id integer ! FK`; `invoice_id integer ! FK`; `ordered_qty numeric !`; `received_qty numeric !`; `balance_qty numeric !`; `last_updated timestamp without time zone ! DEFAULT now()`; `packing_material_id integer FK` |
| `material_receipts` | `id integer ! PK`; `receipt_number varchar(50) ! UQ`; `receipt_date date !`; `po_id integer ! FK`; `medicine_id integer ! FK`; `quantity_received numeric(15,3) !`; `batch_number varchar(50)`; `remarks text`; `received_by integer ! FK`; `created_at timestamp without time zone !` |
| `medicine_master` | `id integer ! PK`; `medicine_code varchar(50) ! UQ`; `medicine_name varchar(200) !`; `product_id integer ! FK`; `composition text`; `dosage_form varchar(50) !`; `strength varchar(50)`; `pack_size varchar(50)`; `hsn_code varchar(20)`; `primary_unit varchar(20)`; `secondary_unit varchar(20)`; `conversion_factor numeric(10,2)`; `primary_packaging varchar(100)`; `secondary_packaging varchar(100)`; `units_per_pack integer`; `regulatory_approvals json`; `manufacturer_vendor_id integer FK`; `rm_vendor_id integer FK`; `pm_vendor_id integer FK`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `medicine_packing_materials` | `id integer ! PK`; `medicine_id integer ! FK`; `packing_material_id integer ! FK`; `vendor_id integer FK`; `qty_required_per_unit numeric(15,4) !`; `uom varchar(20) !`; `artwork_override varchar(500)`; `language_override varchar(50)`; `artwork_version_override varchar(50)`; `hsn_code varchar(20)`; `gst_rate numeric(5,2)`; `pm_role varchar(50)`; `notes text`; `is_critical boolean !`; `lead_time_days integer`; `wastage_percentage numeric(5,2)`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `medicine_raw_materials` | `id integer ! PK`; `medicine_id integer ! FK`; `raw_material_id integer ! FK`; `vendor_id integer FK`; `qty_required_per_unit numeric(15,4) !`; `uom varchar(20) !`; `purity_required numeric(5,2)`; `hsn_code varchar(20)`; `gst_rate numeric(5,2)`; `rm_role varchar(50)`; `notes text`; `is_critical boolean !`; `lead_time_days integer`; `wastage_percentage numeric(5,2)`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `packing_material_master` | `id integer ! PK`; `pm_code varchar(50) ! UQ`; `pm_name varchar(200) !`; `description text`; `pm_type varchar(50)`; `language varchar(50)`; `artwork_version varchar(50)`; `artwork_file_url varchar(500)`; `artwork_approval_ref varchar(100)`; `gsm numeric(10,2)`; `ply integer`; `dimensions varchar(100)`; `color_spec text`; `unit_of_measure varchar(20) !`; `hsn_code varchar(20)`; `gst_rate numeric(5,2)`; `default_vendor_id integer FK`; `printing_instructions text`; `die_cut_info text`; `plate_charges numeric(15,2)`; `storage_conditions text`; `shelf_life_months integer`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `partner_vendor_medicines` | `id integer ! PK`; `vendor_id integer ! FK`; `medicine_id integer ! FK`; `notes text`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `pi` | `id integer ! PK`; `pi_number varchar(50) ! UQ`; `pi_date date !`; `country_id integer ! FK`; `partner_vendor_id integer ! FK`; `total_amount numeric(15,2) !`; `currency varchar(10) !`; `status pistatus !`; `remarks text`; `approved_by integer FK`; `approved_at timestamp without time zone`; `created_by integer ! FK`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `pi_items` | `id integer ! PK`; `pi_id integer ! FK`; `medicine_id integer ! FK`; `quantity numeric(15,3) !`; `unit_price numeric(15,2) !`; `total_price numeric(15,2) !`; `created_at timestamp without time zone !`; `hsn_code varchar(20)`; `pack_size varchar(50)` |
| `po_items` | `id integer ! PK`; `po_id integer ! FK`; `medicine_id integer FK`; `ordered_quantity numeric(15,3) !`; `fulfilled_quantity numeric(15,3) !`; `unit varchar(50)`; `rate_per_unit numeric(15,2)`; `value_amount numeric(15,2)`; `gst_amount numeric(15,2)`; `total_amount numeric(15,2)`; `delivery_schedule text`; `delivery_location text`; `hsn_code varchar(20)`; `gst_rate numeric(5,2)`; `pack_size varchar(50)`; `artwork_file_url varchar(500)`; `artwork_approval_ref varchar(100)`; `language varchar(50)`; `artwork_version varchar(50)`; `gsm numeric(10,2)`; `ply integer`; `box_dimensions varchar(100)`; `color_spec text`; `printing_instructions text`; `die_cut_info text`; `plate_charges numeric(15,2)`; `specification_reference varchar(100)`; `test_method text`; `delivery_schedule_type varchar(50)`; `delivery_date date`; `delivery_window_start date`; `delivery_window_end date`; `quantity_tolerance_percentage numeric(5,2)`; `price_tolerance_percentage numeric(5,2)`; `discount_percentage numeric(5,2)`; `created_at timestamp without time zone !`; `raw_material_id integer FK`; `packing_material_id integer FK` |
| `po_terms_conditions` | `id integer ! PK`; `po_id integer ! FK`; `term_text text !`; `priority integer !`; `created_at timestamp without time zone !` |
| `product_master` | `id integer ! PK`; `product_code varchar(50) ! UQ`; `product_name varchar(200) !`; `description text`; `unit_of_measure varchar(20) !`; `hsn_code varchar(20)`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `purchase_orders` | `id integer ! PK`; `po_number varchar(50) ! UQ`; `po_date date !`; `po_type potype !`; `eopa_id integer ! FK`; `vendor_id integer FK`; `status postatus !`; `total_ordered_qty numeric(15,3) !`; `total_fulfilled_qty numeric(15,3) !`; `total_value_amount numeric(15,2)`; `total_gst_amount numeric(15,2)`; `total_invoice_amount numeric(15,2)`; `ship_to_manufacturer_id integer FK`; `ship_to_address text`; `amendment_reason text`; `currency_exchange_rate numeric(10,4)`; `require_coa boolean !`; `require_bmr boolean !`; `require_msds boolean !`; `sample_quantity numeric(10,2)`; `shelf_life_minimum integer`; `ship_to text`; `bill_to text`; `buyer_reference_no varchar(100)`; `buyer_contact_person varchar(100)`; `transport_mode varchar(50)`; `freight_terms varchar(50)`; `payment_terms varchar(100)`; `currency_code varchar(10)`; `amendment_number integer !`; `amendment_date date`; `original_po_id integer FK`; `prepared_by integer FK`; `prepared_at timestamp without time zone`; `checked_by integer FK`; `checked_at timestamp without time zone`; `approved_by integer FK`; `approved_at timestamp without time zone`; `verified_by integer FK`; `verified_at timestamp without time zone`; `sent_at timestamp without time zone`; `acknowledged_at timestamp without time zone`; `delivery_date date`; `remarks text`; `created_by integer ! FK`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `raw_material_master` | `id integer ! PK`; `rm_code varchar(50) ! UQ`; `rm_name varchar(200) !`; `description text`; `category varchar(50)`; `unit_of_measure varchar(20) !`; `standard_purity numeric(5,2)`; `hsn_code varchar(20)`; `gst_rate numeric(5,2)`; `default_vendor_id integer FK`; `cas_number varchar(50)`; `storage_conditions text`; `shelf_life_months integer`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `system_configuration` | `id integer ! PK`; `config_key varchar(255) ! UQ`; `config_value json !`; `description text`; `category varchar(50)`; `is_sensitive boolean !`; `updated_at timestamp without time zone !` |
| `terms_conditions_master` | `id integer ! PK`; `term_text text !`; `category varchar(50) !`; `priority integer !`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `users` | `id integer ! PK`; `username varchar(50) ! UQ`; `email varchar(100) ! UQ`; `hashed_password varchar(255) !`; `full_name varchar(100) !`; `role userrole !`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `vendor_invoice_items` | `id integer ! PK`; `invoice_id integer ! FK`; `medicine_id integer FK`; `shipped_quantity numeric(15,3) !`; `unit_price numeric(15,2) !`; `total_price numeric(15,2) !`; `tax_rate numeric(5,2) !`; `tax_amount numeric(15,2) !`; `batch_number varchar(50)`; `expiry_date date`; `remarks text`; `created_at timestamp without time zone !`; `hsn_code varchar(20)`; `gst_rate numeric(5,2)`; `gst_amount numeric(15,2)`; `manufacturing_date date`; `raw_material_id integer FK`; `packing_material_id integer FK` |
| `vendor_invoices` | `id integer ! PK`; `invoice_number varchar(100) ! UQ`; `invoice_date date !`; `invoice_type invoicetype !`; `po_id integer ! FK`; `vendor_id integer ! FK`; `subtotal numeric(15,2) !`; `tax_amount numeric(15,2) !`; `total_amount numeric(15,2) !`; `status invoicestatus !`; `remarks text`; `received_by integer ! FK`; `received_at timestamp without time zone !`; `processed_at timestamp without time zone`; `dispatch_note_number varchar(100)`; `dispatch_date date`; `warehouse_location varchar(200)`; `warehouse_received_by varchar(100)`; `hsn_code varchar(20)`; `gst_rate numeric(5,2)`; `gst_amount numeric(15,2)`; `freight_charges numeric(15,2)`; `insurance_charges numeric(15,2)`; `currency_code varchar(10)`; `exchange_rate numeric(15,6)`; `base_currency_amount numeric(15,2)`; `batch_number varchar(100)`; `manufacturing_date date`; `expiry_date date` |
| `vendor_terms_conditions` | `id integer ! PK`; `vendor_id integer ! FK`; `term_id integer ! FK`; `priority_override integer`; `notes text`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `vendors` | `id integer ! PK`; `vendor_code varchar(50) ! UQ`; `vendor_name varchar(200) !`; `vendor_type vendortype !`; `country_id integer ! FK`; `contact_person varchar(100)`; `email varchar(100)`; `phone varchar(20)`; `address text`; `gst_number varchar(15)`; `drug_license_number varchar(100)`; `gmp_certified boolean !`; `iso_certified boolean !`; `credit_days integer`; `is_active boolean !`; `created_at timestamp without time zone !`; `updated_at timestamp without time zone !` |
| `warehouse_grn` | `id integer ! PK`; `grn_number varchar(50) ! UQ`; `grn_date date !`; `dispatch_advice_id integer ! FK`; `quantity_received numeric(15,3) !`; `remarks text`; `received_by integer ! FK`; `created_at timestamp without time zone !` |

## Foreign keys observed in the live database

| From | To |
|---|---|
| `dispatch_advice.medicine_id` | `medicine_master.id` |
| `dispatch_advice.dispatched_by` | `users.id` |
| `eopa.pi_id` | `pi.id` |
| `eopa.approved_by`, `eopa.created_by` | `users.id` |
| `eopa_items.eopa_id` | `eopa.id` |
| `eopa_items.pi_item_id` | `pi_items.id` |
| `eopa_items.created_by` | `users.id` |
| `material_balance.raw_material_id` | `raw_material_master.id` |
| `material_balance.packing_material_id` | `packing_material_master.id` |
| `material_balance.vendor_id` | `vendors.id` |
| `material_balance.po_id` | `purchase_orders.id` |
| `material_balance.invoice_id` | `vendor_invoices.id` |
| `material_receipts.po_id` | `purchase_orders.id` |
| `material_receipts.medicine_id` | `medicine_master.id` |
| `material_receipts.received_by` | `users.id` |
| `medicine_master.product_id` | `product_master.id` |
| `medicine_master.manufacturer_vendor_id`, `rm_vendor_id`, `pm_vendor_id` | `vendors.id` |
| `medicine_packing_materials.medicine_id` | `medicine_master.id` |
| `medicine_packing_materials.packing_material_id` | `packing_material_master.id` |
| `medicine_packing_materials.vendor_id` | `vendors.id` |
| `medicine_raw_materials.medicine_id` | `medicine_master.id` |
| `medicine_raw_materials.raw_material_id` | `raw_material_master.id` |
| `medicine_raw_materials.vendor_id` | `vendors.id` |
| `packing_material_master.default_vendor_id` | `vendors.id` |
| `partner_vendor_medicines.vendor_id` | `vendors.id` |
| `partner_vendor_medicines.medicine_id` | `medicine_master.id` |
| `pi.country_id` | `countries.id` |
| `pi.partner_vendor_id` | `vendors.id` |
| `pi.approved_by`, `pi.created_by` | `users.id` |
| `pi_items.pi_id` | `pi.id` |
| `pi_items.medicine_id` | `medicine_master.id` |
| `po_items.po_id` | `purchase_orders.id` |
| `po_items.medicine_id` | `medicine_master.id` |
| `po_items.raw_material_id` | `raw_material_master.id` |
| `po_items.packing_material_id` | `packing_material_master.id` |
| `po_terms_conditions.po_id` | `purchase_orders.id` |
| `purchase_orders.eopa_id` | `eopa.id` |
| `purchase_orders.vendor_id`, `ship_to_manufacturer_id` | `vendors.id` |
| `purchase_orders.original_po_id` | `purchase_orders.id` |
| `purchase_orders.prepared_by`, `checked_by`, `approved_by`, `verified_by`, `created_by` | `users.id` |
| `raw_material_master.default_vendor_id` | `vendors.id` |
| `vendor_invoice_items.invoice_id` | `vendor_invoices.id` |
| `vendor_invoice_items.medicine_id` | `medicine_master.id` |
| `vendor_invoice_items.raw_material_id` | `raw_material_master.id` |
| `vendor_invoice_items.packing_material_id` | `packing_material_master.id` |
| `vendor_invoices.po_id` | `purchase_orders.id` |
| `vendor_invoices.vendor_id` | `vendors.id` |
| `vendor_invoices.received_by` | `users.id` |
| `vendor_terms_conditions.vendor_id` | `vendors.id` |
| `vendor_terms_conditions.term_id` | `terms_conditions_master.id` |
| `vendors.country_id` | `countries.id` |
| `warehouse_grn.dispatch_advice_id` | `dispatch_advice.id` |
| `warehouse_grn.received_by` | `users.id` |

`eopa_backup` has no foreign keys. The live schema also does not define a check constraint requiring exactly one of the three product-reference columns to be populated in `po_items` or `vendor_invoice_items`.

## Differences from the earlier model-based summary

- `dispatch_advice` and `warehouse_grn` are present in the live database even though the model-registration list used earlier was incomplete for those model classes.
- `eopa_backup` exists with nullable columns and no primary key or foreign keys.
- `material_balance` exists despite a repository migration file named `drop_material_balance_table.py`.
- `vendor_invoices` has header-level `hsn_code`, `gst_rate`, `gst_amount`, `batch_number`, `manufacturing_date`, and `expiry_date` columns; some are absent from the current invoice model source.
- `material_balance` has no `packing_material_id` in the original model shown earlier, but it is present in PostgreSQL.
- `alembic_version.version_num` is `5374a7ebec48`; use this live revision when reconciling migration history.

These differences mean the live database must be treated as its own source of truth until code, migrations, and schema are reconciled. The snapshot file is the complete authoritative DDL captured during this inspection.
