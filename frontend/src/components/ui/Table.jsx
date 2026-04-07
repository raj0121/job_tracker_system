import { motion } from "framer-motion";
import { listItem, staggerContainer } from "../../lib/motion";

const Table = ({ className = "", children }) => (
  <div className={`table-wrapper ${className}`.trim()}>
    <table className="table">{children}</table>
  </div>
);

const Head = ({ children, className = "" }) => <thead className={className}>{children}</thead>;
const Body = ({ children, className = "" }) => (
  <motion.tbody className={className} variants={staggerContainer} initial="initial" animate="animate">
    {children}
  </motion.tbody>
);
const Row = ({ children, className = "", ...rest }) => (
  <motion.tr className={`table-row ${className}`.trim()} variants={listItem} {...rest}>
    {children}
  </motion.tr>
);
const HeadCell = ({ children, className = "", align = "left", ...rest }) => (
  <th
    className={`${align === "right" ? "align-right" : align === "center" ? "align-center" : "align-left"} ${className}`.trim()}
    {...rest}
  >
    {children}
  </th>
);
const Cell = ({ children, className = "", align = "left", ...rest }) => (
  <td
    className={`${align === "right" ? "align-right" : align === "center" ? "align-center" : "align-left"} ${className}`.trim()}
    {...rest}
  >
    {children}
  </td>
);

Table.Head = Head;
Table.Body = Body;
Table.Row = Row;
Table.HeadCell = HeadCell;
Table.Cell = Cell;

export default Table;
