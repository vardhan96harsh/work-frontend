import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

/* ============================= */
/*  Convert Minutes → HH:MM:SS  */
/* ============================= */
function formatTimeFromMinutes(totalMinutes) {
  const totalSeconds = Math.round((Number(totalMinutes) || 0) * 60);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    String(hours).padStart(2, "0") + ":" +
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0")
  );
}

export default function ExportProjectExcel({ projectsTree, from, to }) {

  const exportProjectExcel = () => {

    if (!projectsTree || projectsTree.length === 0) {
      alert("No project data available.");
      return;
    }

    const rows = [];
    const rowTypes = [];

    /* ============================= */
    /*  HEADER ROW                  */
    /* ============================= */
    rows.push({
      Project: "Project",
      Company: "Company",
      Employee: "Employee",
      Date: "Date",
      Time: "Time (HH:MM:SS)"
    });
    rowTypes.push("header");

    /* ============================= */
    /*  DATA BUILDING               */
    /* ============================= */
    projectsTree.forEach((project) => {

      const users = project.users || [];

      // Calculate user totals properly from dates
      const computedUsers = users.map((u) => {
        const totalMinutes = (u.dates || [])
          .reduce((acc, d) => acc + Number(d.minutes || 0), 0);

        return {
          userName: u.userName,
          dates: u.dates || [],
          totalMinutes
        };
      });

      // Calculate project total properly
      const projectTotalMinutes = computedUsers
        .reduce((acc, u) => acc + u.totalMinutes, 0);

      /* ============================= */
      /*  PROJECT ROW                 */
      /* ============================= */
      rows.push({
        Project: project.projectName,
        Company: project.companyName,
        Employee: "",
        Date: "",
        Time: formatTimeFromMinutes(projectTotalMinutes)
      });
      rowTypes.push("project");

      /* ============================= */
      /*  USER + DATE ROWS            */
      /* ============================= */
      computedUsers.forEach((u) => {

        // USER ROW
        rows.push({
          Project: "",
          Company: "",
          Employee: u.userName,
          Date: "",
          Time: formatTimeFromMinutes(u.totalMinutes)
        });
        rowTypes.push("user");

        // DATE ROWS
        u.dates.forEach((d) => {
          rows.push({
            Project: "",
            Company: "",
            Employee: "",
            Date: d.date,
            Time: formatTimeFromMinutes(d.minutes)
          });
          rowTypes.push("date");
        });

      });

      // spacing row
      rows.push({});
      rowTypes.push("space");

    });

    /* ============================= */
    /*  CREATE SHEET                */
    /* ============================= */
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["Project", "Company", "Employee", "Date", "Time"],
      skipHeader: true
    });

    ws["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 15 },
      { wch: 15 }
    ];

    const range = XLSX.utils.decode_range(ws["!ref"]);

    const border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };

    /* ============================= */
    /*  APPLY STYLING               */
    /* ============================= */
    for (let r = 0; r <= range.e.r; r++) {

      const type = rowTypes[r];

      for (let c = 0; c <= range.e.c; c++) {

        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;

        cell.s = {
          border,
          alignment: { vertical: "center", horizontal: c === 4 ? "right" : "left" }
        };

        if (type === "header") {
          cell.s = {
            ...cell.s,
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4CAF50" } },
            alignment: { horizontal: "center" }
          };
        }

        if (type === "project") {
          cell.s = {
            ...cell.s,
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1F4E78" } }
          };
        }

        if (type === "user") {
          cell.s = {
            ...cell.s,
            font: { bold: true },
            fill: { fgColor: { rgb: "D9E1F2" } }
          };
        }

        if (type === "date") {
          cell.s = {
            ...cell.s,
            fill: { fgColor: { rgb: "F2F2F2" } }
          };
        }
      }
    }

    /* ============================= */
    /*  EXPORT FILE                 */
    /* ============================= */
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Project Report");

    const buffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array"
    });

    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      `Project_Report_${from}_to_${to}.xlsx`
    );
  };

  return (
    <button
      onClick={exportProjectExcel}
      className="rounded-lg bg-gray-900 text-white px-4 py-1 text-sm hover:bg-black"
    >
      Export Project Report
    </button>
  );
}