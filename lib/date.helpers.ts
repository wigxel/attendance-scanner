import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { format } from "date-fns/format";
import { O, pipe } from "./fp.helpers";

type DateType = string | Date | number;

export const DateParse = {
  try(date: Date | string): O.Option<Date> {
    if (typeof date === "string") {
      return DateParse.parse(date);
    }

    if (!isValid(date)) return O.none();

    return O.some(date);
  },

  parse(iso_string: string) {
    return pipe(
      O.fromNullable(iso_string),
      O.map((e: string) => parseISO(e)),
      O.flatMap((date) => {
        return !date.toString().includes("Invalid") ? O.some(date) : O.none();
      }),
    );
  },
  format(date: string | Date | number, format_str: string) {
    return pipe(
      typeof date === "string" ? DateParse.parse(date) : O.fromNullable(date),
      O.map((date) => format(date, format_str)),
    );
  },

  presets: {
    dateOnly(date: DateType) {
      return DateParse.format(date, "do MMM, yy");
    },
    timestamp(date: DateType) {
      return DateParse.format(date, "do MMM yy • hh:mm:ss aaa");
    },
    toNow(date: string) {
      return DateParse.parse(date).pipe(
        O.map((v) => formatDistanceToNow(v, { addSuffix: false })),
      );
    },
  },
};
