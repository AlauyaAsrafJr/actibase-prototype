import { Search } from "lucide-react";
import Form from "react-bootstrap/Form";

export default function SearchInput({ value, onChange, placeholder = "Search…", style }) {
  return (
    <div className="ab-search-input" style={style}>
      <Search size={15} strokeWidth={2} className="ab-search-icon" />
      <Form.Control size="sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
