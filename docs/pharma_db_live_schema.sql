--
-- PostgreSQL database dump
--

\restrict F0vWbkH8NR8A0sEfVruEAc6yzpNbps8gZexS0CgUYNaPDTZSyhkWzAaSOCeeAzS

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: eopastatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.eopastatus AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: invoicestatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoicestatus AS ENUM (
    'PENDING',
    'PROCESSED',
    'CANCELLED'
);


--
-- Name: invoicetype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoicetype AS ENUM (
    'RM',
    'PM',
    'FG'
);


--
-- Name: pistatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pistatus AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: postatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.postatus AS ENUM (
    'OPEN',
    'CLOSED',
    'CANCELLED',
    'PARTIAL',
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'READY',
    'SENT',
    'ACKNOWLEDGED'
);


--
-- Name: potype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.potype AS ENUM (
    'RM',
    'PM',
    'FG'
);


--
-- Name: userrole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.userrole AS ENUM (
    'ADMIN',
    'PROCUREMENT_OFFICER',
    'WAREHOUSE_MANAGER',
    'ACCOUNTANT'
);


--
-- Name: vendortype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendortype AS ENUM (
    'PARTNER',
    'RM',
    'PM',
    'MANUFACTURER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    country_code character varying(3) NOT NULL,
    country_name character varying(100) NOT NULL,
    language character varying(50) NOT NULL,
    currency character varying(3),
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- Name: dispatch_advice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispatch_advice (
    id integer NOT NULL,
    dispatch_number character varying(50) NOT NULL,
    dispatch_date date NOT NULL,
    medicine_id integer NOT NULL,
    quantity_dispatched numeric(15,3) NOT NULL,
    destination character varying(200) NOT NULL,
    remarks text,
    dispatched_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: dispatch_advice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dispatch_advice_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dispatch_advice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dispatch_advice_id_seq OWNED BY public.dispatch_advice.id;


--
-- Name: eopa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eopa (
    id integer CONSTRAINT eopa_new_id_not_null NOT NULL,
    eopa_number character varying(50) CONSTRAINT eopa_new_eopa_number_not_null NOT NULL,
    eopa_date date CONSTRAINT eopa_new_eopa_date_not_null NOT NULL,
    pi_id integer CONSTRAINT eopa_new_pi_id_not_null NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    remarks text,
    approved_by integer,
    approved_at timestamp without time zone,
    created_by integer CONSTRAINT eopa_new_created_by_not_null NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: eopa_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eopa_backup (
    id integer,
    eopa_number character varying(50),
    eopa_date date,
    pi_item_id integer,
    status character varying(20),
    quantity numeric(15,3),
    estimated_unit_price numeric(15,2),
    estimated_total numeric(15,2),
    remarks text,
    approved_by integer,
    approved_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: eopa_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eopa_items (
    id integer NOT NULL,
    eopa_id integer NOT NULL,
    pi_item_id integer NOT NULL,
    quantity numeric(15,3) NOT NULL,
    estimated_unit_price numeric(15,2) NOT NULL,
    estimated_total numeric(15,2) NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: eopa_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eopa_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eopa_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eopa_items_id_seq OWNED BY public.eopa_items.id;


--
-- Name: eopa_new_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eopa_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eopa_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eopa_new_id_seq OWNED BY public.eopa.id;


--
-- Name: material_balance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_balance (
    id integer NOT NULL,
    raw_material_id integer,
    vendor_id integer NOT NULL,
    po_id integer NOT NULL,
    invoice_id integer NOT NULL,
    ordered_qty numeric NOT NULL,
    received_qty numeric NOT NULL,
    balance_qty numeric NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    packing_material_id integer
);


--
-- Name: material_balance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.material_balance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: material_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.material_balance_id_seq OWNED BY public.material_balance.id;


--
-- Name: material_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_receipts (
    id integer NOT NULL,
    receipt_number character varying(50) NOT NULL,
    receipt_date date NOT NULL,
    po_id integer NOT NULL,
    medicine_id integer NOT NULL,
    quantity_received numeric(15,3) NOT NULL,
    batch_number character varying(50),
    remarks text,
    received_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: material_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.material_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: material_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.material_receipts_id_seq OWNED BY public.material_receipts.id;


--
-- Name: medicine_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_master (
    id integer NOT NULL,
    medicine_code character varying(50) NOT NULL,
    medicine_name character varying(200) NOT NULL,
    product_id integer NOT NULL,
    strength character varying(50),
    dosage_form character varying(50) NOT NULL,
    pack_size character varying(50),
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    composition text,
    manufacturer_vendor_id integer,
    rm_vendor_id integer,
    pm_vendor_id integer,
    hsn_code character varying(20),
    primary_unit character varying(50),
    secondary_unit character varying(50),
    conversion_factor numeric(10,4),
    primary_packaging character varying(100),
    secondary_packaging character varying(100),
    units_per_pack integer,
    regulatory_approvals jsonb
);


--
-- Name: medicine_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_master_id_seq OWNED BY public.medicine_master.id;


--
-- Name: medicine_packing_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_packing_materials (
    id integer NOT NULL,
    medicine_id integer NOT NULL,
    packing_material_id integer NOT NULL,
    vendor_id integer,
    qty_required_per_unit numeric(15,4) NOT NULL,
    uom character varying(20) NOT NULL,
    artwork_override character varying(500),
    language_override character varying(50),
    artwork_version_override character varying(50),
    hsn_code character varying(20),
    gst_rate numeric(5,2),
    pm_role character varying(50),
    notes text,
    is_critical boolean NOT NULL,
    lead_time_days integer,
    wastage_percentage numeric(5,2),
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: medicine_packing_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_packing_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_packing_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_packing_materials_id_seq OWNED BY public.medicine_packing_materials.id;


--
-- Name: medicine_raw_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_raw_materials (
    id integer NOT NULL,
    medicine_id integer NOT NULL,
    raw_material_id integer NOT NULL,
    vendor_id integer,
    qty_required_per_unit numeric(15,4) NOT NULL,
    uom character varying(20) NOT NULL,
    purity_required numeric(5,2),
    hsn_code character varying(20),
    gst_rate numeric(5,2),
    notes text,
    is_critical boolean NOT NULL,
    lead_time_days integer,
    wastage_percentage numeric(5,2),
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    rm_role character varying(50)
);


--
-- Name: medicine_raw_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_raw_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_raw_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_raw_materials_id_seq OWNED BY public.medicine_raw_materials.id;


--
-- Name: packing_material_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packing_material_master (
    id integer NOT NULL,
    pm_code character varying(50) NOT NULL,
    pm_name character varying(200) NOT NULL,
    description text,
    pm_type character varying(50),
    language character varying(50),
    artwork_version character varying(50),
    artwork_file_url character varying(500),
    artwork_approval_ref character varying(100),
    gsm numeric(10,2),
    ply integer,
    dimensions character varying(100),
    color_spec text,
    unit_of_measure character varying(20) NOT NULL,
    hsn_code character varying(20),
    gst_rate numeric(5,2),
    default_vendor_id integer,
    printing_instructions text,
    die_cut_info text,
    plate_charges numeric(15,2),
    storage_conditions text,
    shelf_life_months integer,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: packing_material_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.packing_material_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: packing_material_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.packing_material_master_id_seq OWNED BY public.packing_material_master.id;


--
-- Name: partner_vendor_medicines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_vendor_medicines (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    medicine_id integer NOT NULL,
    notes text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: partner_vendor_medicines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partner_vendor_medicines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_vendor_medicines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_vendor_medicines_id_seq OWNED BY public.partner_vendor_medicines.id;


--
-- Name: pi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pi (
    id integer NOT NULL,
    pi_number character varying(50) NOT NULL,
    pi_date date NOT NULL,
    partner_vendor_id integer NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    currency character varying(10) NOT NULL,
    remarks text,
    created_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    country_id integer NOT NULL,
    status public.pistatus DEFAULT 'PENDING'::public.pistatus,
    approved_by integer,
    approved_at timestamp without time zone
);


--
-- Name: pi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pi_id_seq OWNED BY public.pi.id;


--
-- Name: pi_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pi_items (
    id integer NOT NULL,
    pi_id integer NOT NULL,
    medicine_id integer NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    hsn_code character varying(20),
    pack_size character varying(100)
);


--
-- Name: pi_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pi_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pi_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pi_items_id_seq OWNED BY public.pi_items.id;


--
-- Name: po_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    medicine_id integer,
    created_at timestamp without time zone NOT NULL,
    ordered_quantity numeric(15,3) NOT NULL,
    fulfilled_quantity numeric(15,3) DEFAULT '0'::numeric NOT NULL,
    language character varying(50),
    artwork_version character varying(50),
    unit character varying(50),
    hsn_code character varying(20),
    gst_rate numeric(5,2),
    pack_size character varying(100),
    artwork_file_url character varying(500),
    artwork_approval_ref character varying(100),
    gsm numeric(8,2),
    ply integer,
    box_dimensions character varying(100),
    color_spec character varying(200),
    printing_instructions text,
    die_cut_info character varying(200),
    plate_charges numeric(15,2),
    specification_reference character varying(100),
    test_method character varying(100),
    delivery_schedule_type character varying(50),
    delivery_date date,
    delivery_window_start date,
    delivery_window_end date,
    quantity_tolerance_percentage numeric(5,2),
    price_tolerance_percentage numeric(5,2),
    discount_percentage numeric(5,2),
    raw_material_id integer,
    packing_material_id integer,
    rate_per_unit numeric(15,2),
    value_amount numeric(15,2),
    gst_amount numeric(15,2),
    total_amount numeric(15,2),
    delivery_schedule text,
    delivery_location text,
    CONSTRAINT chk_po_item_one_material_type CHECK ((((((medicine_id IS NOT NULL))::integer + ((raw_material_id IS NOT NULL))::integer) + ((packing_material_id IS NOT NULL))::integer) = 1))
);


--
-- Name: po_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.po_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: po_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.po_items_id_seq OWNED BY public.po_items.id;


--
-- Name: po_terms_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_terms_conditions (
    id integer NOT NULL,
    po_id integer NOT NULL,
    term_text text NOT NULL,
    priority integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: po_terms_conditions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.po_terms_conditions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: po_terms_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.po_terms_conditions_id_seq OWNED BY public.po_terms_conditions.id;


--
-- Name: product_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_master (
    id integer NOT NULL,
    product_code character varying(50) NOT NULL,
    product_name character varying(200) NOT NULL,
    description text,
    unit_of_measure character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    hsn_code character varying(20)
);


--
-- Name: product_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_master_id_seq OWNED BY public.product_master.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    po_number character varying(50) NOT NULL,
    po_date date NOT NULL,
    po_type public.potype NOT NULL,
    eopa_id integer NOT NULL,
    vendor_id integer,
    status public.postatus NOT NULL,
    delivery_date date,
    remarks text,
    created_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    total_ordered_qty numeric(15,3) DEFAULT '0'::numeric NOT NULL,
    total_fulfilled_qty numeric(15,3) DEFAULT '0'::numeric NOT NULL,
    require_coa boolean DEFAULT false,
    require_bmr boolean DEFAULT false,
    require_msds boolean DEFAULT false,
    sample_quantity numeric(10,2),
    shelf_life_minimum integer,
    ship_to text,
    bill_to text,
    buyer_reference_no character varying(100),
    buyer_contact_person character varying(200),
    transport_mode character varying(50),
    freight_terms character varying(100),
    payment_terms text,
    currency_code character varying(10),
    amendment_number integer DEFAULT 0,
    amendment_date date,
    original_po_id integer,
    prepared_by character varying(200),
    checked_by character varying(200),
    approved_by character varying(200),
    verified_by character varying(200),
    prepared_at timestamp without time zone,
    checked_at timestamp without time zone,
    approved_at timestamp without time zone,
    verified_at timestamp without time zone,
    sent_at timestamp without time zone,
    acknowledged_at timestamp without time zone,
    total_value_amount numeric(15,2) DEFAULT '0'::numeric,
    total_gst_amount numeric(15,2) DEFAULT '0'::numeric,
    total_invoice_amount numeric(15,2) DEFAULT '0'::numeric,
    ship_to_manufacturer_id integer,
    ship_to_address text,
    amendment_reason text,
    currency_exchange_rate numeric(10,4) DEFAULT 1.0000
);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: raw_material_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_master (
    id integer NOT NULL,
    rm_code character varying(50) NOT NULL,
    rm_name character varying(200) NOT NULL,
    description text,
    category character varying(50),
    unit_of_measure character varying(20) NOT NULL,
    standard_purity numeric(5,2),
    hsn_code character varying(20),
    gst_rate numeric(5,2),
    default_vendor_id integer,
    cas_number character varying(50),
    storage_conditions text,
    shelf_life_months integer,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: raw_material_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.raw_material_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: raw_material_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.raw_material_master_id_seq OWNED BY public.raw_material_master.id;


--
-- Name: system_configuration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configuration (
    id integer NOT NULL,
    config_key character varying(255) NOT NULL,
    config_value json NOT NULL,
    description text,
    category character varying(50),
    is_sensitive boolean NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: system_configuration_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_configuration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_configuration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_configuration_id_seq OWNED BY public.system_configuration.id;


--
-- Name: terms_conditions_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terms_conditions_master (
    id integer NOT NULL,
    term_text text NOT NULL,
    category character varying(50) NOT NULL,
    priority integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: terms_conditions_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.terms_conditions_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: terms_conditions_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.terms_conditions_master_id_seq OWNED BY public.terms_conditions_master.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    full_name character varying(100) NOT NULL,
    role public.userrole NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vendor_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    medicine_id integer,
    shipped_quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    tax_rate numeric(5,2) NOT NULL,
    tax_amount numeric(15,2) NOT NULL,
    batch_number character varying(50),
    expiry_date date,
    remarks text,
    created_at timestamp without time zone NOT NULL,
    hsn_code character varying(20),
    gst_rate numeric(5,2),
    gst_amount numeric(15,2),
    manufacturing_date date,
    raw_material_id integer,
    packing_material_id integer
);


--
-- Name: vendor_invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_invoice_items_id_seq OWNED BY public.vendor_invoice_items.id;


--
-- Name: vendor_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_invoices (
    id integer NOT NULL,
    invoice_number character varying(100) NOT NULL,
    invoice_date date NOT NULL,
    invoice_type public.invoicetype NOT NULL,
    po_id integer NOT NULL,
    vendor_id integer NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    tax_amount numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    status public.invoicestatus NOT NULL,
    remarks text,
    received_by integer NOT NULL,
    received_at timestamp without time zone NOT NULL,
    processed_at timestamp without time zone,
    dispatch_note_number character varying(100),
    dispatch_date date,
    warehouse_location character varying(200),
    warehouse_received_by character varying(100),
    hsn_code character varying(20),
    gst_rate numeric(5,2),
    gst_amount numeric(15,2),
    freight_charges numeric(15,2),
    insurance_charges numeric(15,2),
    currency_code character varying(10),
    exchange_rate numeric(15,6),
    base_currency_amount numeric(15,2),
    batch_number character varying(100),
    manufacturing_date date,
    expiry_date date
);


--
-- Name: vendor_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_invoices_id_seq OWNED BY public.vendor_invoices.id;


--
-- Name: vendor_terms_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_terms_conditions (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    term_id integer NOT NULL,
    priority_override integer,
    notes text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: vendor_terms_conditions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_terms_conditions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_terms_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_terms_conditions_id_seq OWNED BY public.vendor_terms_conditions.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    vendor_code character varying(50) NOT NULL,
    vendor_name character varying(200) NOT NULL,
    vendor_type public.vendortype NOT NULL,
    contact_person character varying(100),
    email character varying(100),
    phone character varying(20),
    address text,
    gst_number character varying(15),
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    country_id integer NOT NULL,
    drug_license_number character varying(100),
    gmp_certified boolean DEFAULT false,
    iso_certified boolean DEFAULT false,
    credit_days integer
);


--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: warehouse_grn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_grn (
    id integer NOT NULL,
    grn_number character varying(50) NOT NULL,
    grn_date date NOT NULL,
    dispatch_advice_id integer NOT NULL,
    quantity_received numeric(15,3) NOT NULL,
    remarks text,
    received_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: warehouse_grn_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_grn_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_grn_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_grn_id_seq OWNED BY public.warehouse_grn.id;


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- Name: dispatch_advice id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_advice ALTER COLUMN id SET DEFAULT nextval('public.dispatch_advice_id_seq'::regclass);


--
-- Name: eopa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa ALTER COLUMN id SET DEFAULT nextval('public.eopa_new_id_seq'::regclass);


--
-- Name: eopa_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa_items ALTER COLUMN id SET DEFAULT nextval('public.eopa_items_id_seq'::regclass);


--
-- Name: material_balance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_balance ALTER COLUMN id SET DEFAULT nextval('public.material_balance_id_seq'::regclass);


--
-- Name: material_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts ALTER COLUMN id SET DEFAULT nextval('public.material_receipts_id_seq'::regclass);


--
-- Name: medicine_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_master ALTER COLUMN id SET DEFAULT nextval('public.medicine_master_id_seq'::regclass);


--
-- Name: medicine_packing_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_packing_materials ALTER COLUMN id SET DEFAULT nextval('public.medicine_packing_materials_id_seq'::regclass);


--
-- Name: medicine_raw_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_raw_materials ALTER COLUMN id SET DEFAULT nextval('public.medicine_raw_materials_id_seq'::regclass);


--
-- Name: packing_material_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_material_master ALTER COLUMN id SET DEFAULT nextval('public.packing_material_master_id_seq'::regclass);


--
-- Name: partner_vendor_medicines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_vendor_medicines ALTER COLUMN id SET DEFAULT nextval('public.partner_vendor_medicines_id_seq'::regclass);


--
-- Name: pi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi ALTER COLUMN id SET DEFAULT nextval('public.pi_id_seq'::regclass);


--
-- Name: pi_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_items ALTER COLUMN id SET DEFAULT nextval('public.pi_items_id_seq'::regclass);


--
-- Name: po_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items ALTER COLUMN id SET DEFAULT nextval('public.po_items_id_seq'::regclass);


--
-- Name: po_terms_conditions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_terms_conditions ALTER COLUMN id SET DEFAULT nextval('public.po_terms_conditions_id_seq'::regclass);


--
-- Name: product_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_master ALTER COLUMN id SET DEFAULT nextval('public.product_master_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: raw_material_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_master ALTER COLUMN id SET DEFAULT nextval('public.raw_material_master_id_seq'::regclass);


--
-- Name: system_configuration id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configuration ALTER COLUMN id SET DEFAULT nextval('public.system_configuration_id_seq'::regclass);


--
-- Name: terms_conditions_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms_conditions_master ALTER COLUMN id SET DEFAULT nextval('public.terms_conditions_master_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vendor_invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items ALTER COLUMN id SET DEFAULT nextval('public.vendor_invoice_items_id_seq'::regclass);


--
-- Name: vendor_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices ALTER COLUMN id SET DEFAULT nextval('public.vendor_invoices_id_seq'::regclass);


--
-- Name: vendor_terms_conditions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_terms_conditions ALTER COLUMN id SET DEFAULT nextval('public.vendor_terms_conditions_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Name: warehouse_grn id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_grn ALTER COLUMN id SET DEFAULT nextval('public.warehouse_grn_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: countries countries_country_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_country_name_key UNIQUE (country_name);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: dispatch_advice dispatch_advice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_advice
    ADD CONSTRAINT dispatch_advice_pkey PRIMARY KEY (id);


--
-- Name: eopa_items eopa_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa_items
    ADD CONSTRAINT eopa_items_pkey PRIMARY KEY (id);


--
-- Name: eopa eopa_new_eopa_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa
    ADD CONSTRAINT eopa_new_eopa_number_key UNIQUE (eopa_number);


--
-- Name: eopa eopa_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa
    ADD CONSTRAINT eopa_new_pkey PRIMARY KEY (id);


--
-- Name: material_balance material_balance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_balance
    ADD CONSTRAINT material_balance_pkey PRIMARY KEY (id);


--
-- Name: material_receipts material_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts
    ADD CONSTRAINT material_receipts_pkey PRIMARY KEY (id);


--
-- Name: medicine_master medicine_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_master
    ADD CONSTRAINT medicine_master_pkey PRIMARY KEY (id);


--
-- Name: medicine_packing_materials medicine_packing_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_packing_materials
    ADD CONSTRAINT medicine_packing_materials_pkey PRIMARY KEY (id);


--
-- Name: medicine_raw_materials medicine_raw_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_raw_materials
    ADD CONSTRAINT medicine_raw_materials_pkey PRIMARY KEY (id);


--
-- Name: packing_material_master packing_material_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_material_master
    ADD CONSTRAINT packing_material_master_pkey PRIMARY KEY (id);


--
-- Name: partner_vendor_medicines partner_vendor_medicines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_vendor_medicines
    ADD CONSTRAINT partner_vendor_medicines_pkey PRIMARY KEY (id);


--
-- Name: pi_items pi_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_items
    ADD CONSTRAINT pi_items_pkey PRIMARY KEY (id);


--
-- Name: pi pi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi
    ADD CONSTRAINT pi_pkey PRIMARY KEY (id);


--
-- Name: po_items po_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT po_items_pkey PRIMARY KEY (id);


--
-- Name: po_terms_conditions po_terms_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_terms_conditions
    ADD CONSTRAINT po_terms_conditions_pkey PRIMARY KEY (id);


--
-- Name: product_master product_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_master
    ADD CONSTRAINT product_master_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: raw_material_master raw_material_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_master
    ADD CONSTRAINT raw_material_master_pkey PRIMARY KEY (id);


--
-- Name: system_configuration system_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configuration
    ADD CONSTRAINT system_configuration_pkey PRIMARY KEY (id);


--
-- Name: terms_conditions_master terms_conditions_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms_conditions_master
    ADD CONSTRAINT terms_conditions_master_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoice_items vendor_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoices vendor_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_pkey PRIMARY KEY (id);


--
-- Name: vendor_terms_conditions vendor_terms_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_terms_conditions
    ADD CONSTRAINT vendor_terms_conditions_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: warehouse_grn warehouse_grn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_grn
    ADD CONSTRAINT warehouse_grn_pkey PRIMARY KEY (id);


--
-- Name: idx_eopa_items_eopa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eopa_items_eopa_id ON public.eopa_items USING btree (eopa_id);


--
-- Name: idx_eopa_items_pi_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eopa_items_pi_item_id ON public.eopa_items USING btree (pi_item_id);


--
-- Name: idx_eopa_pi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eopa_pi_id ON public.eopa USING btree (pi_id);


--
-- Name: idx_eopa_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eopa_status ON public.eopa USING btree (status);


--
-- Name: idx_medicine_hsn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_hsn ON public.medicine_master USING btree (hsn_code);


--
-- Name: idx_pi_item_hsn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_item_hsn ON public.pi_items USING btree (hsn_code);


--
-- Name: idx_po_item_hsn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_item_hsn ON public.po_items USING btree (hsn_code);


--
-- Name: idx_po_items_rate_per_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_items_rate_per_unit ON public.po_items USING btree (rate_per_unit);


--
-- Name: idx_po_items_total_amount; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_items_total_amount ON public.po_items USING btree (total_amount);


--
-- Name: idx_po_original; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_original ON public.purchase_orders USING btree (original_po_id);


--
-- Name: idx_po_terms_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_terms_po ON public.po_terms_conditions USING btree (po_id);


--
-- Name: idx_po_terms_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_terms_priority ON public.po_terms_conditions USING btree (priority);


--
-- Name: idx_product_hsn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_hsn ON public.product_master USING btree (hsn_code);


--
-- Name: idx_purchase_orders_ship_to_manufacturer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_ship_to_manufacturer ON public.purchase_orders USING btree (ship_to_manufacturer_id);


--
-- Name: idx_vendor_invoice_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_invoice_batch ON public.vendor_invoices USING btree (batch_number);


--
-- Name: idx_vendor_invoice_hsn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_invoice_hsn ON public.vendor_invoices USING btree (hsn_code);


--
-- Name: idx_vendor_invoice_item_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_invoice_item_batch ON public.vendor_invoice_items USING btree (batch_number);


--
-- Name: idx_vendor_invoice_item_hsn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_invoice_item_hsn ON public.vendor_invoice_items USING btree (hsn_code);


--
-- Name: ix_countries_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_countries_country_code ON public.countries USING btree (country_code);


--
-- Name: ix_countries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_countries_id ON public.countries USING btree (id);


--
-- Name: ix_dispatch_advice_dispatch_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_dispatch_advice_dispatch_number ON public.dispatch_advice USING btree (dispatch_number);


--
-- Name: ix_dispatch_advice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dispatch_advice_id ON public.dispatch_advice USING btree (id);


--
-- Name: ix_material_balance_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_material_balance_id ON public.material_balance USING btree (id);


--
-- Name: ix_material_receipts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_material_receipts_id ON public.material_receipts USING btree (id);


--
-- Name: ix_material_receipts_receipt_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_material_receipts_receipt_number ON public.material_receipts USING btree (receipt_number);


--
-- Name: ix_medicine_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_medicine_master_id ON public.medicine_master USING btree (id);


--
-- Name: ix_medicine_master_medicine_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_medicine_master_medicine_code ON public.medicine_master USING btree (medicine_code);


--
-- Name: ix_medicine_packing_materials_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_medicine_packing_materials_id ON public.medicine_packing_materials USING btree (id);


--
-- Name: ix_medicine_packing_materials_medicine_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_medicine_packing_materials_medicine_id ON public.medicine_packing_materials USING btree (medicine_id);


--
-- Name: ix_medicine_packing_materials_packing_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_medicine_packing_materials_packing_material_id ON public.medicine_packing_materials USING btree (packing_material_id);


--
-- Name: ix_medicine_raw_materials_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_medicine_raw_materials_id ON public.medicine_raw_materials USING btree (id);


--
-- Name: ix_medicine_raw_materials_medicine_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_medicine_raw_materials_medicine_id ON public.medicine_raw_materials USING btree (medicine_id);


--
-- Name: ix_medicine_raw_materials_raw_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_medicine_raw_materials_raw_material_id ON public.medicine_raw_materials USING btree (raw_material_id);


--
-- Name: ix_packing_material_master_hsn_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_packing_material_master_hsn_code ON public.packing_material_master USING btree (hsn_code);


--
-- Name: ix_packing_material_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_packing_material_master_id ON public.packing_material_master USING btree (id);


--
-- Name: ix_packing_material_master_pm_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_packing_material_master_pm_code ON public.packing_material_master USING btree (pm_code);


--
-- Name: ix_partner_vendor_medicines_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_partner_vendor_medicines_id ON public.partner_vendor_medicines USING btree (id);


--
-- Name: ix_partner_vendor_medicines_medicine_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_partner_vendor_medicines_medicine_id ON public.partner_vendor_medicines USING btree (medicine_id);


--
-- Name: ix_partner_vendor_medicines_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_partner_vendor_medicines_vendor_id ON public.partner_vendor_medicines USING btree (vendor_id);


--
-- Name: ix_pi_country_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pi_country_id ON public.pi USING btree (country_id);


--
-- Name: ix_pi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pi_id ON public.pi USING btree (id);


--
-- Name: ix_pi_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pi_items_id ON public.pi_items USING btree (id);


--
-- Name: ix_pi_pi_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_pi_pi_number ON public.pi USING btree (pi_number);


--
-- Name: ix_po_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_po_items_id ON public.po_items USING btree (id);


--
-- Name: ix_product_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_master_id ON public.product_master USING btree (id);


--
-- Name: ix_product_master_product_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_product_master_product_code ON public.product_master USING btree (product_code);


--
-- Name: ix_purchase_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_id ON public.purchase_orders USING btree (id);


--
-- Name: ix_purchase_orders_po_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_purchase_orders_po_number ON public.purchase_orders USING btree (po_number);


--
-- Name: ix_raw_material_master_hsn_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_raw_material_master_hsn_code ON public.raw_material_master USING btree (hsn_code);


--
-- Name: ix_raw_material_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_raw_material_master_id ON public.raw_material_master USING btree (id);


--
-- Name: ix_raw_material_master_rm_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_raw_material_master_rm_code ON public.raw_material_master USING btree (rm_code);


--
-- Name: ix_system_configuration_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_system_configuration_category ON public.system_configuration USING btree (category);


--
-- Name: ix_system_configuration_config_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_system_configuration_config_key ON public.system_configuration USING btree (config_key);


--
-- Name: ix_system_configuration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_system_configuration_id ON public.system_configuration USING btree (id);


--
-- Name: ix_terms_conditions_master_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_terms_conditions_master_category ON public.terms_conditions_master USING btree (category);


--
-- Name: ix_terms_conditions_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_terms_conditions_master_id ON public.terms_conditions_master USING btree (id);


--
-- Name: ix_terms_conditions_master_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_terms_conditions_master_is_active ON public.terms_conditions_master USING btree (is_active);


--
-- Name: ix_terms_conditions_master_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_terms_conditions_master_priority ON public.terms_conditions_master USING btree (priority);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_vendor_invoice_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendor_invoice_items_id ON public.vendor_invoice_items USING btree (id);


--
-- Name: ix_vendor_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendor_invoice_items_invoice_id ON public.vendor_invoice_items USING btree (invoice_id);


--
-- Name: ix_vendor_invoices_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendor_invoices_id ON public.vendor_invoices USING btree (id);


--
-- Name: ix_vendor_invoices_invoice_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_vendor_invoices_invoice_number ON public.vendor_invoices USING btree (invoice_number);


--
-- Name: ix_vendor_invoices_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendor_invoices_po_id ON public.vendor_invoices USING btree (po_id);


--
-- Name: ix_vendor_terms_conditions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendor_terms_conditions_id ON public.vendor_terms_conditions USING btree (id);


--
-- Name: ix_vendor_terms_conditions_term_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendor_terms_conditions_term_id ON public.vendor_terms_conditions USING btree (term_id);


--
-- Name: ix_vendor_terms_conditions_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendor_terms_conditions_vendor_id ON public.vendor_terms_conditions USING btree (vendor_id);


--
-- Name: ix_vendors_country_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendors_country_id ON public.vendors USING btree (country_id);


--
-- Name: ix_vendors_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendors_id ON public.vendors USING btree (id);


--
-- Name: ix_vendors_vendor_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_vendors_vendor_code ON public.vendors USING btree (vendor_code);


--
-- Name: ix_warehouse_grn_grn_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_warehouse_grn_grn_number ON public.warehouse_grn USING btree (grn_number);


--
-- Name: ix_warehouse_grn_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_warehouse_grn_id ON public.warehouse_grn USING btree (id);


--
-- Name: dispatch_advice dispatch_advice_dispatched_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_advice
    ADD CONSTRAINT dispatch_advice_dispatched_by_fkey FOREIGN KEY (dispatched_by) REFERENCES public.users(id);


--
-- Name: dispatch_advice dispatch_advice_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_advice
    ADD CONSTRAINT dispatch_advice_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_master(id);


--
-- Name: eopa eopa_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa
    ADD CONSTRAINT eopa_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: eopa eopa_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa
    ADD CONSTRAINT eopa_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: eopa_items eopa_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa_items
    ADD CONSTRAINT eopa_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: eopa_items eopa_items_eopa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa_items
    ADD CONSTRAINT eopa_items_eopa_id_fkey FOREIGN KEY (eopa_id) REFERENCES public.eopa(id) ON DELETE CASCADE;


--
-- Name: eopa_items eopa_items_pi_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa_items
    ADD CONSTRAINT eopa_items_pi_item_id_fkey FOREIGN KEY (pi_item_id) REFERENCES public.pi_items(id);


--
-- Name: eopa eopa_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eopa
    ADD CONSTRAINT eopa_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.pi(id);


--
-- Name: vendor_invoice_items fk_invoice_item_packing_material; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT fk_invoice_item_packing_material FOREIGN KEY (packing_material_id) REFERENCES public.packing_material_master(id);


--
-- Name: vendor_invoice_items fk_invoice_item_raw_material; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT fk_invoice_item_raw_material FOREIGN KEY (raw_material_id) REFERENCES public.raw_material_master(id);


--
-- Name: material_balance fk_material_balance_packing_material; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_balance
    ADD CONSTRAINT fk_material_balance_packing_material FOREIGN KEY (packing_material_id) REFERENCES public.packing_material_master(id);


--
-- Name: pi fk_pi_country_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi
    ADD CONSTRAINT fk_pi_country_id FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: po_items fk_po_item_packing_material; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT fk_po_item_packing_material FOREIGN KEY (packing_material_id) REFERENCES public.packing_material_master(id);


--
-- Name: po_items fk_po_item_raw_material; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT fk_po_item_raw_material FOREIGN KEY (raw_material_id) REFERENCES public.raw_material_master(id);


--
-- Name: purchase_orders fk_po_original; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT fk_po_original FOREIGN KEY (original_po_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;


--
-- Name: purchase_orders fk_ship_to_manufacturer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT fk_ship_to_manufacturer FOREIGN KEY (ship_to_manufacturer_id) REFERENCES public.vendors(id);


--
-- Name: vendors fk_vendors_country_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT fk_vendors_country_id FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: material_balance material_balance_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_balance
    ADD CONSTRAINT material_balance_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.vendor_invoices(id);


--
-- Name: material_balance material_balance_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_balance
    ADD CONSTRAINT material_balance_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: material_balance material_balance_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_balance
    ADD CONSTRAINT material_balance_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_material_master(id);


--
-- Name: material_balance material_balance_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_balance
    ADD CONSTRAINT material_balance_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: material_receipts material_receipts_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts
    ADD CONSTRAINT material_receipts_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_master(id);


--
-- Name: material_receipts material_receipts_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts
    ADD CONSTRAINT material_receipts_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: material_receipts material_receipts_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts
    ADD CONSTRAINT material_receipts_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: medicine_master medicine_master_manufacturer_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_master
    ADD CONSTRAINT medicine_master_manufacturer_vendor_id_fkey FOREIGN KEY (manufacturer_vendor_id) REFERENCES public.vendors(id);


--
-- Name: medicine_master medicine_master_pm_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_master
    ADD CONSTRAINT medicine_master_pm_vendor_id_fkey FOREIGN KEY (pm_vendor_id) REFERENCES public.vendors(id);


--
-- Name: medicine_master medicine_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_master
    ADD CONSTRAINT medicine_master_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product_master(id);


--
-- Name: medicine_master medicine_master_rm_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_master
    ADD CONSTRAINT medicine_master_rm_vendor_id_fkey FOREIGN KEY (rm_vendor_id) REFERENCES public.vendors(id);


--
-- Name: medicine_packing_materials medicine_packing_materials_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_packing_materials
    ADD CONSTRAINT medicine_packing_materials_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_master(id);


--
-- Name: medicine_packing_materials medicine_packing_materials_packing_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_packing_materials
    ADD CONSTRAINT medicine_packing_materials_packing_material_id_fkey FOREIGN KEY (packing_material_id) REFERENCES public.packing_material_master(id);


--
-- Name: medicine_packing_materials medicine_packing_materials_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_packing_materials
    ADD CONSTRAINT medicine_packing_materials_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: medicine_raw_materials medicine_raw_materials_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_raw_materials
    ADD CONSTRAINT medicine_raw_materials_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_master(id);


--
-- Name: medicine_raw_materials medicine_raw_materials_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_raw_materials
    ADD CONSTRAINT medicine_raw_materials_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_material_master(id);


--
-- Name: medicine_raw_materials medicine_raw_materials_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_raw_materials
    ADD CONSTRAINT medicine_raw_materials_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: packing_material_master packing_material_master_default_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packing_material_master
    ADD CONSTRAINT packing_material_master_default_vendor_id_fkey FOREIGN KEY (default_vendor_id) REFERENCES public.vendors(id);


--
-- Name: partner_vendor_medicines partner_vendor_medicines_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_vendor_medicines
    ADD CONSTRAINT partner_vendor_medicines_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_master(id) ON DELETE CASCADE;


--
-- Name: partner_vendor_medicines partner_vendor_medicines_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_vendor_medicines
    ADD CONSTRAINT partner_vendor_medicines_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: pi pi_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi
    ADD CONSTRAINT pi_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: pi pi_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi
    ADD CONSTRAINT pi_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pi_items pi_items_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_items
    ADD CONSTRAINT pi_items_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_master(id);


--
-- Name: pi_items pi_items_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_items
    ADD CONSTRAINT pi_items_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.pi(id);


--
-- Name: pi pi_partner_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi
    ADD CONSTRAINT pi_partner_vendor_id_fkey FOREIGN KEY (partner_vendor_id) REFERENCES public.vendors(id);


--
-- Name: po_items po_items_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT po_items_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_master(id);


--
-- Name: po_items po_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT po_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: po_terms_conditions po_terms_conditions_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_terms_conditions
    ADD CONSTRAINT po_terms_conditions_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: raw_material_master raw_material_master_default_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_master
    ADD CONSTRAINT raw_material_master_default_vendor_id_fkey FOREIGN KEY (default_vendor_id) REFERENCES public.vendors(id);


--
-- Name: vendor_invoice_items vendor_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.vendor_invoices(id);


--
-- Name: vendor_invoice_items vendor_invoice_items_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_master(id);


--
-- Name: vendor_invoices vendor_invoices_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: vendor_invoices vendor_invoices_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: vendor_invoices vendor_invoices_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: vendor_terms_conditions vendor_terms_conditions_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_terms_conditions
    ADD CONSTRAINT vendor_terms_conditions_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms_conditions_master(id) ON DELETE CASCADE;


--
-- Name: vendor_terms_conditions vendor_terms_conditions_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_terms_conditions
    ADD CONSTRAINT vendor_terms_conditions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: warehouse_grn warehouse_grn_dispatch_advice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_grn
    ADD CONSTRAINT warehouse_grn_dispatch_advice_id_fkey FOREIGN KEY (dispatch_advice_id) REFERENCES public.dispatch_advice(id);


--
-- Name: warehouse_grn warehouse_grn_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_grn
    ADD CONSTRAINT warehouse_grn_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict F0vWbkH8NR8A0sEfVruEAc6yzpNbps8gZexS0CgUYNaPDTZSyhkWzAaSOCeeAzS

