import { FilterOutlined, CloseOutlined, ThunderboltOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Input,
  Select,
  Row,
  Col,
  Dropdown,
  Button,
  Slider,
  Typography,
  Avatar,
  Space,
  Tooltip
} from "antd";
import { useState, useEffect, useCallback } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import TONIcon from "./icons/TONIcon";

const { Text } = Typography;

const API_BASE = process.env.REACT_APP_API_URL ?? "";
const IMAGE_URL = process.env.REACT_APP_IMAGES_URL ?? "";

interface Option {
  id: number;
  name: string;
  image_url?: string | null; 
}

type AssetFolder = "collections" | "models" | "bgs" | "symbols";
type AssetExt = "png" | "jpg" | "jpeg" | "webp" | "svg";

interface SelectOption {
  value: number;
  label: string;
  image_url?: string | null;
  folder: AssetFolder;
}

export interface FilterState {
  search: string;
  smart: boolean;
  collection_ids: number[];
  model_ids: number[];
  background_ids: number[];
  symbol_ids: number[];
  price_min?: number;
  price_max?: number;
  sort: string | null;
}

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
  loading?: boolean;
}

const MAX_INPUT_LENGTH = 50;
const DEFAULT_IMAGE_EXT: AssetExt = "webp";
const BG_EXT: AssetExt = "png";

const buildImageUrl = (
  folder: AssetFolder,
  fileName?: string | null,
  ext: AssetExt = DEFAULT_IMAGE_EXT
) => {
  if (!fileName) return undefined;
  if (folder === "bgs") ext = BG_EXT; 
  return `${IMAGE_URL}/${folder}/${fileName}.${ext}`;
};

const toSelectOptions = (items: Option[], folder: AssetFolder): SelectOption[] =>
  items.map((o) => ({
    value: o.id,
    label: o.name,
    image_url: o.image_url,
    folder,
  }));

const filterOption = (
  input: string,
  option?: { label?: string; value?: number }
) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

const OptionWithImage = ({
  image_url,
  label,
}: {
  image_url?: string;
  label: string;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <Avatar
      src={image_url}
      size={22}
      shape="square"
      style={{
        flexShrink: 0,
        background: "var(--ant-color-fill-secondary)",
        fontSize: 10,
      }}
    >
      {!image_url ? label[0]?.toUpperCase() : null}
    </Avatar>
    <span
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  </div>
);

const EMPTY_FILTERS: FilterState = {
  search: "",
  smart: false,
  collection_ids: [],
  model_ids: [],
  background_ids: [],
  symbol_ids: [],
  sort: null,
};

const FilterBar = ({ onFilterChange, loading = false }: FilterBarProps) => {
  const popupContainer = () => document.body;

  const [collections, setCollections] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [backgrounds, setBackgrounds] = useState<Option[]>([]);
  const [symbols, setSymbols] = useState<Option[]>([]);

  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false);
  const [loadingSymbols, setLoadingSymbols] = useState(false);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const [open, setOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 3000]);
  const [sortOrder, setSortOrder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [smart, setSmart] = useState(false);

  useEffect(() => {
    setLoadingCollections(true);
    fetch(`${API_BASE}/api/filters/collections`)
      .then((r) => r.json())
      .then(setCollections)
      .finally(() => setLoadingCollections(false));

    setLoadingBackgrounds(true);
    fetch(`${API_BASE}/api/filters/backgrounds`)
      .then((r) => r.json())
      .then(setBackgrounds)
      .finally(() => setLoadingBackgrounds(false));

    setLoadingSymbols(true);
    fetch(`${API_BASE}/api/filters/symbols`)
      .then((r) => r.json())
      .then(setSymbols)
      .finally(() => setLoadingSymbols(false));
  }, []);

  useEffect(() => {
    if (filters.collection_ids.length === 0) {
      setModels([]);
      return;
    }

    setLoadingModels(true);
    const ids = filters.collection_ids.join(",");
    fetch(`${API_BASE}/api/filters/models?collection_ids=${ids}`)
      .then((r) => r.json())
      .then(setModels)
      .finally(() => setLoadingModels(false));
  }, [filters.collection_ids]);

  const notify = useCallback(
    (next: FilterState) => onFilterChange?.(next),
    [onFilterChange]
  );

  const updateFilters = (patch: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      notify(next);
      return next;
    });
  };

  const handleClear = () => {
    setSearch("");
    setSmart(false);
    setPriceRange([0, 3000]);
    setSortOrder(null);
    setModels([]);
    setFilters(EMPTY_FILTERS);
    notify(EMPTY_FILTERS);
    setOpen(false);
  };

  const handleApply = () => {
    updateFilters({
      price_min: priceRange[0],
      price_max: priceRange[1],
      sort: sortOrder,
    });
    setOpen(false);
  };

  const filterPopup = (
    <div
      className="flex flex-col w-[260px] gap-[var(--size-base)] rounded-[var(--size-smm)] p-[var(--size-base)]
      border border-solid border-gray-800 bg-[var(--ant-color-bg-elevated)]"
    >
      <div>
        <Text strong>
          Price, <TONIcon /> TON
        </Text>
        <Row align="middle" gutter={8} className="mt-[8px]">
          <Col>
            <Text>{priceRange[0]}</Text>
          </Col>
          <Col flex="auto">
            <Slider
              range
              min={0}
              max={3000}
              value={priceRange}
              onChange={(val) => setPriceRange(val as [number, number])}
            />
          </Col>
          <Col>
            <Text>{priceRange[1]}</Text>
          </Col>
        </Row>
      </div>

      <div>
        <Text strong>Sort</Text>
        <Select
          className="w-full mt-[8px]"
          placeholder="Select sorting"
          value={sortOrder}
          onChange={setSortOrder}
          options={[
            { value: "price_desc", label: "By price (Desc)" },
            { value: "price_asc", label: "By price (Asc)" },
            { value: "newest", label: "New ones first" },
          ]}
        />
      </div>

      <Button block danger icon={<CloseOutlined />} onClick={handleClear}>
        Clear all
      </Button>
      <Button
        block
        type="primary"
        onClick={handleApply}
        className="bg-[var(--green-accept)]"
      >
        Apply
      </Button>
    </div>
  );

  const sharedSelectProps = {
    className: `!bg-[var(--liquid-glass-bg)] w-full`,
    style: {
      backdropFilter: "blur(var(--liquid-glass-blur))",
    } as CSSProperties,
    getPopupContainer: popupContainer,
    size: "large" as const,
    mode: "multiple" as const,
    maxTagCount: "responsive" as const,
    showSearch: true,
    filterOption,
    onInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      if (input.value.length >= MAX_INPUT_LENGTH && e.key.length === 1) {
        e.preventDefault();
      }
    },
    optionRender: (opt: { data: SelectOption }) => (
      <OptionWithImage
        image_url={buildImageUrl(opt.data.folder, opt.data.image_url)}
        label={opt.data.label}
      />
    ),
  };

  const runSearch = () => {
    updateFilters({ search: search.trim(), smart });
  };

  const toggleSmart = () => {
    const nextSmart = !smart;
    setSmart(nextSmart);
    updateFilters({ smart: nextSmart });
  };

  const handleCollectionChange = (ids: number[]) => {
    setModels([]);
    updateFilters({ collection_ids: ids, model_ids: [] });
  };

  return (
    <Row className="w-full" gutter={[8, 8]} align="middle">
      <Col xs={24} lg={7}>
        {/* <Input.Search
          className="w-full"
          placeholder="Search"
          allowClear
          size="large"
          maxLength={MAX_INPUT_LENGTH}
          onSearch={(val) => updateFilters({ search: val })}
          onChange={(e) => !e.target.value && updateFilters({ search: "" })}
        /> */}
        <Space.Compact className="w-full">
          <Input
            placeholder={smart ? "Smart search" : "Search"}
            allowClear
            size="large"
            maxLength={MAX_INPUT_LENGTH}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!e.target.value) {
                updateFilters({ search: "", smart });
              }
            }}
            onPressEnter={runSearch}
          />

          <Tooltip title={smart ? "Smart search enabled" : "Enable smart search"}>
            <Button
              size="large"
              type={smart ? "primary" : "default"}
              icon={<ThunderboltOutlined />}
              disabled={loading}
              onClick={toggleSmart}
            />
          </Tooltip>

          <Tooltip title="Search">
            <Button
              size="large"
              icon={<SearchOutlined />}
              loading={loading}
              onClick={runSearch}
            />
          </Tooltip>
        </Space.Compact>

      </Col>

      <Col xs={12} sm={12} md={6} lg={4}>
        <Select
          {...sharedSelectProps}
          placeholder="Collection"
          loading={loadingCollections}
          options={toSelectOptions(collections, "collections")}
          value={filters.collection_ids}
          onChange={handleCollectionChange}
        />
      </Col>

      <Col xs={12} sm={12} md={6} lg={4}>
        <Select
          {...sharedSelectProps}
          placeholder={
            filters.collection_ids.length === 0 ? "Select collection first" : "Model"
          }
          disabled={filters.collection_ids.length === 0}
          loading={loadingModels}
          options={toSelectOptions(models, "models")}
          value={filters.model_ids}
          onChange={(ids: number[]) => updateFilters({ model_ids: ids })}
        />
      </Col>

      <Col xs={12} sm={12} md={6} lg={4}>
        <Select
          {...sharedSelectProps}
          placeholder="Background"
          loading={loadingBackgrounds}
          options={toSelectOptions(backgrounds, "bgs")}
          value={filters.background_ids}
          onChange={(ids: number[]) => updateFilters({ background_ids: ids })}
        />
      </Col>

      <Col xs={12} sm={12} md={6} lg={4}>
        <Select
          {...sharedSelectProps}
          placeholder="Symbol"
          loading={loadingSymbols}
          options={toSelectOptions(symbols, "symbols")}
          value={filters.symbol_ids}
          onChange={(ids: number[]) => updateFilters({ symbol_ids: ids })}
        />
      </Col>

      <Col xs={12} sm={12} md={6} lg={1}>
        <Dropdown
          open={open}
          onOpenChange={setOpen}
          trigger={["click"]}
          getPopupContainer={popupContainer}
          popupRender={() => filterPopup}
          placement="bottomRight"
        >
          <Button
            icon={<FilterOutlined />}
            size="large"
            className={`!bg-[var(--liquid-glass-bg)] w-full antd-icon`}
            style={{ backdropFilter: "blur(var(--liquid-glass-blur))" }}
          />
        </Dropdown>
      </Col>
    </Row>
  );
};

export default FilterBar;
