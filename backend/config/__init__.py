# Python 3.14 compatibility patch for Django Context copy
import sys

if sys.version_info >= (3, 14):
    try:
        import django.template.context as _ctx

        def _fixed_base_copy(self):
            obj = self.__class__.__new__(self.__class__)
            obj.__dict__.update(self.__dict__)
            obj.dicts = self.dicts[:]
            return obj

        _ctx.BaseContext.__copy__ = _fixed_base_copy
    except Exception:
        pass
